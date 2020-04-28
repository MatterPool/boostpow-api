import Container from 'typedi';
import { GetUnredeemedBoostJobUtxos } from '../services/use_cases/GetUnredeemedBoostJobUtxos';
import * as bitcoinfiles from 'bitcoinfiles-sdk';
import * as boost from 'boostpow-js';
import { SubmitBoostJobProof } from '../services/use_cases/SubmitBoostJobProof';
import { SubmitBoostJob } from '../services/use_cases/SubmitBoostJob';

export class BoostBlockchainMonitor {
    private blockchainScanner;
    private static baseFilter = Buffer.from('boostpow', 'utf8').toString('hex');

    private constructor(initHeight?: number) {
        this.blockchainScanner = bitcoinfiles.scanner({
            initHeight: initHeight ? initHeight : 632392, // Just a default starting point
            saveUpdatedHeight: true,
        });
    }

    public static async instance() {
        if (!BoostBlockchainMonitor.instance_) {
            BoostBlockchainMonitor.instance_ = BoostBlockchainMonitor.createInstance();
        }
        return BoostBlockchainMonitor.instance_;
    }

    /**
     * Update the filters to track the new outputs
     * @param monitoredOutputs The updated outputs to monitor
     */
    public async updateFilters(monitoredOutputs: string[]) {
        const outputFilterResult = await bitcoinfiles.instance().saveOutputFilter(monitoredOutputs);
        await this.blockchainScanner.filter({
            baseFilter: BoostBlockchainMonitor.baseFilter,
            outputFilterId: outputFilterResult.result.id
        });
    }

    private static instance_;

    private static isBoostJob(rawtx) {
        try {
            const boostJob = boost.BoostPowJob.fromRawTransaction(rawtx);
            if (boostJob) {
                return true;
            }
        } catch (ex) {
            console.log(ex);
        }
        return false;
    }

    private static isBoostSolution(raw) {
        try {
            const boostJobProof = boost.BoostPowJobProof.fromRawTransaction(raw);
            if (boostJobProof) {
                return true;
            }
        } catch (ex) {
            console.log(ex);
        }
        return false;
    }

    private static async saveBoostSolution(rawtx) {
        try {
            const submitBoostJobProof = Container.get(SubmitBoostJobProof);
            const boostJobProof = boost.BoostPowJobProof.fromRawTransaction(rawtx);
            if (boostJobProof) {
                console.log('Found BoostJobProof', boostJobProof);
                await submitBoostJobProof.run({ rawtx: rawtx})
            }
            return;
        } catch (ex) {
            console.log(ex)
        }
    }

    private static async processTransaction(e: { h: string, raw: string }) {
        if (BoostBlockchainMonitor.isBoostJob(e.raw)) {
            BoostBlockchainMonitor.saveBoostJob(e.raw);
        } else if (BoostBlockchainMonitor.isBoostSolution(e.raw)) {
            BoostBlockchainMonitor.saveBoostSolution(e.raw);
        }
    }

    private static async saveBoostJob(e) {
        try {
            const boostJob = boost.BoostPowJob.fromRawTransaction(e.raw);
            if (boostJob) {
                console.log('Found BoostJob', boostJob);
                const submitBoostJob = Container.get(SubmitBoostJob);
                await submitBoostJob.run({ rawtx: e.raw})
            }
            return;
        } catch (ex) {
            console.log(ex)
        }
    }

    private static async createInstance() {
        const monitor = new BoostBlockchainMonitor();
        monitor.setup();
        return monitor;
    }

    private async setup() {
        // Set up the initial boost job utxos to monitor
        const getUnredeemedBoostJobUtxos = Container.get(GetUnredeemedBoostJobUtxos);
        const unredeemedOutputs = await getUnredeemedBoostJobUtxos.run();
        await this.updateFilters(unredeemedOutputs);

        // Subscribe listeners
        this.blockchainScanner.mempool(async (e, self) => {
            BoostBlockchainMonitor.processTransaction(e);
        })
        .block(async (block, self) => {
            for (const e of block.tx) {
                BoostBlockchainMonitor.processTransaction(e);
            }
        })
        .error((err, self) => {
            console.log('error', err.toString(), self);
        })
        .start();
    }
}
