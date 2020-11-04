import Container from 'typedi';
import { GetUnredeemedBoostJobUtxos } from '../services/use_cases/GetUnredeemedBoostJobUtxos';
import * as bitcoinfiles from 'bitcoinfiles-sdk';
import * as boost from '@matterpool/boostpow-js';
import { SubmitBoostJobProof } from '../services/use_cases/SubmitBoostJobProof';
import { SubmitBoostJob } from '../services/use_cases/SubmitBoostJob';

export class BoostBlockchainMonitor {
    private blockchainScanner;
    private static baseFilter = Buffer.from('boostpow', 'utf8').toString('hex');

    private constructor(initHeight?: number) {
        this.blockchainScanner = bitcoinfiles.scanner({
            initHeight: initHeight ? initHeight : 632392, // Just a default starting point
            saveUpdatedHeight: true,
            debug: true,
        });
    }

    public static async instance() {
        if (!BoostBlockchainMonitor.instance_) {
            BoostBlockchainMonitor.instance_ = BoostBlockchainMonitor.createInstance();
        }
        return BoostBlockchainMonitor.instance_;
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
            console.log('mempool here', e);
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
            const boostJobs = boost.BoostPowJob.fromTransactionGetAllOutputs(rawtx);
            if (boostJobs && boostJobs.length) {
                return true;
            }
        } catch (ex) {
            console.log(ex);
        }
        return false;
    }

    private static isBoostSolution(rawtx) {
        try {
            const boostJobProof = boost.BoostPowJobProof.fromRawTransaction(rawtx);
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
                return;
            }
            console.log('saveBoostSolution null', rawtx);
            return;
        } catch (ex) {
            console.log(ex)
        }
    }

    private static async processTransaction(e: { h: string, raw: string }) {

        if (!e.h) {
            console.log('processTransaction skipping...', e);
            return;
        }
        console.log('processTransaction', e.h);
        if (BoostBlockchainMonitor.isBoostJob(e.raw)) {
            console.log('processTransaction boostJob', e.h);
            BoostBlockchainMonitor.saveBoostJob(e.raw);
        } else if (BoostBlockchainMonitor.isBoostSolution(e.raw)) {
            console.log('processTransaction boostJobProof', e.h);
            BoostBlockchainMonitor.saveBoostSolution(e.raw);
        }
    }

    private static async saveBoostJob(rawtx) {
        try {
            const boostJobs = boost.BoostPowJob.fromTransactionGetAllOutputs(rawtx);
            if (boostJobs && boostJobs.length) {
                for (const boostJob of boostJobs) {
                    console.log('Found BoostJob', boostJob);
                    const submitBoostJob = Container.get(SubmitBoostJob);
                    await submitBoostJob.run({ rawtx: rawtx})
                }
                return;
            }
            console.log('saveBoostJob null', rawtx);
            return;
        } catch (ex) {
            console.log(ex)
        }
    }
}
