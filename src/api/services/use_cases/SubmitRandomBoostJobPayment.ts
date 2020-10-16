

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import * as boost from '@matterpool/boostpow-js';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJob } from '../../models/BoostJob';
import * as bsv from 'bsv';
import * as Minercraft from 'minercraft';
import { GetRandomBoostFeeQuote } from './GetRandomBoostFeeQuote';
import { BitcoinUtils } from '../../../helpers/bitcoin-utils';
import { ServiceError } from '../errors/ServiceError';
import { GetRandomBoostJobStatus } from './GetRandomBoostJobStatus';

@Service()
export class SubmitRandomBoostJobPayment implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository,
        @Service() private getRandomBoostJobFeeQuote: GetRandomBoostFeeQuote,
        @Service() private getRandomBoostJobStatus: GetRandomBoostJobStatus,
    ) {
    }

    public isEmpty(v: any): boolean {
        if (v === undefined || v === null || v === '' || v === 0) {
            return true;
        }
        return false;
    }
    private async ensureTransactionBroadcasted(rawtx: string) {
        try {
            const miner = new Minercraft.default({
              url: 'https://public.txq-app.com',
              headers: {
                  'content-type': 'application/json',
                  'checkStatus': true, // Set check status to force checking tx instead of blindly broadcasting if it's not needed
              },
            });
            const response = await miner.tx.push(rawtx, {
              verbose: true,
              maxContentLength: 52428890,
              maxBodyLength: 52428890
            });

            if (response && response.payload && response.payload.returnResult === 'success') {
                return true;
            } else if (response && response.payload) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.log('ensureTransactionBroadcasted', rawtx, err);
            throw err;
        }
    }
    public createTransaction(
        content: string,
        feeMenu: any,
        numOutputs: number,
        diff: number,
        paymentInfo: { txid: string, index: number, script: string, value: number},
        serviceWifKey: any): string {
        const baseAmountForOutputs = numOutputs * feeMenu.baseFeePerOutput;
        const remainderAmount = paymentInfo.value - baseAmountForOutputs;
        const totalAmountAvailablePerDifficultyInAnOutput = Math.floor(remainderAmount / numOutputs);
        const availableDiff = Math.floor(totalAmountAvailablePerDifficultyInAnOutput / feeMenu.feePerDifficultyPerOutput);
        if (availableDiff < diff) {
            throw new ClientError(422, 'Invalid total difficulty units for fee');
        }
        const boostOutputValue = 600 + (availableDiff * feeMenu.feePerDifficultyPerOutput);
        const outputs = []
        for (let i = 0; i < numOutputs; i++) {
            const boostOutputJob = boost.BoostPowJob.fromObject({
                content: content,
                diff: availableDiff,
                additionalData: paymentInfo.txid
            })
            outputs.push(new bsv.Transaction.Output({
                script: boostOutputJob.toScript(),
                satoshis: boostOutputValue
            }));
        }
        const inputs = [
          new bsv.Transaction.Input({
            output: new bsv.Transaction.Output({
                script: paymentInfo.script.toString(),
                satoshis: paymentInfo.value,
            }),
            prevTxId: paymentInfo.txid,
            outputIndex: paymentInfo.index,
            script: bsv.Script.empty()
          })
        ];
        const boostJobsTx = new bsv.Transaction();
        boostJobsTx.addInput(inputs[0]);
        for (const o of outputs) {
            boostJobsTx.addOutput(o);
        }
        const sigtype = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;
        const flags = bsv.Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA | bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES;
        const signature = bsv.Transaction.sighash.sign(boostJobsTx, serviceWifKey, sigtype, 0, boostJobsTx.inputs[0].output.script, new bsv.crypto.BN(boostJobsTx.inputs[0].output.satoshis), flags);
        const unlockingScript = new bsv.Script({});
        unlockingScript
        .add(
            Buffer.concat([
            signature.toBuffer(),
            Buffer.from([sigtype & 0xff])
            ])
        )
        .add(serviceWifKey.toPublicKey().toBuffer())
        boostJobsTx.inputs[0].setScript(unlockingScript);
        return boostJobsTx.toString();
     }

    public static addressFromOutput(output): bsv.Address {
        let address = '';
        try {
            address = bsv.Address.fromScript(output.script);
        } catch (err) {
            console.log('err', err);
            return undefined;
        }
        return address;
    }

    public isValidPaymentTransaction(rawtx: string, expectedTotalFee: number, serviceAddress: bsv.Address): { txid: string, index: number, value: number, script: string} {
        const tx = new bsv.Transaction(rawtx);
        let index = 0;
        for (const o of tx.outputs) {
            if (SubmitRandomBoostJobPayment.addressFromOutput(o).toString() === serviceAddress.toString()) {
                if (o.satoshis >= expectedTotalFee) {
                    return {
                        txid: tx.hash,
                        index: index,
                        value: o.satoshis,
                        script: o.script
                    }
                }
            }
            index++;
        }
        throw new ServiceError(422, 'No valid payment transaction found. Check fee for diff and outputs.' + expectedTotalFee);
    }

    public getServiceAddress(): bsv.Address {
        return BitcoinUtils.getPaymentAddress(0, process.env.RANDOM_NUMBER_SERVICE_XPRV_KEY);
    }
    public getServiceKey(): bsv.PrivateKey {
        const key = BitcoinUtils.getPaymentAddressKey(0, process.env.RANDOM_NUMBER_SERVICE_XPRV_KEY);
        return key;
    }

    public async run(params: {rawtx: string, numOutputs: number, diff: number, content?: string}): Promise<any> {
        if (
            this.isEmpty(params.rawtx)
        ) {
            throw new ClientError(422, 'Required fields: rawtx. Optional: diff, numOutputs');
        }
        params.numOutputs = params.numOutputs || 1;


        params.diff = params.diff || 1; // It will get adjusted for maximum affordable below

        if (params.numOutputs > 100 || params.diff < 1 || params.diff > 100000000) {
            throw new ClientError(422, 'There must be no more than 100 outputs and diff between 1 and 100,000,000');
        }

        const feeMenu = await this.getRandomBoostJobFeeQuote.run();
        console.log('fee menu', feeMenu, params);
        const expectedTotalFee = (feeMenu.baseFeePerOutput * params.numOutputs) + feeMenu.feePerDifficultyPerOutput * params.diff;
        if (isNaN(expectedTotalFee)) {
            throw new ClientError(422, 'Invalid expectedTotalFee');
        }
        const paymentInfo = this.isValidPaymentTransaction(params.rawtx, expectedTotalFee, this.getServiceAddress());

        // If it was already spent, then just return it.
        const alreadySaved = await this.boostJobRepo.find({
            spends_parenttxid: paymentInfo.txid,
        });
        if (alreadySaved && alreadySaved.length) {
            return this.getRandomBoostJobStatus.run({ txid: alreadySaved[0].txid })
        }

        if (paymentInfo.value < expectedTotalFee) {
            throw new ClientError(422, 'Expected fee does not match: ' + paymentInfo.value + ', ' + expectedTotalFee);
        }

        let contentNormalized: any = params.content;
        const TXID_REGEX = new RegExp('^[0-9a-fA-F]{64}$');
        if (!TXID_REGEX.test(contentNormalized)) {
            contentNormalized = Buffer.from(contentNormalized, 'utf8');
        }

        const boostJobsTx = this.createTransaction(contentNormalized, feeMenu, params.numOutputs, params.diff, paymentInfo, this.getServiceKey());
        await this.ensureTransactionBroadcasted(params.rawtx);
        await this.ensureTransactionBroadcasted(boostJobsTx);
        const boostJobs = boost.BoostPowJob.fromTransactionGetAllOutputs(new bsv.Transaction(boostJobsTx));
        const boostJobEntities = [];
        for (const boostJob of boostJobs) {
            let boostJobEntity = await this.boostJobRepo.findOne({
                txid: boostJob.getTxid(),
                vout: boostJob.getVout(),
            });
            if (!boostJobEntity) {
                const newBoostJob = new BoostJob();
                newBoostJob.inserted_at = Math.round((new Date().getTime()) / 1000);
                newBoostJob.txid = boostJob.getTxid();
                newBoostJob.vout = boostJob.getVout();
                newBoostJob.scripthash = boostJob.getScriptHash();
                newBoostJob.rawtx = boostJobsTx;
                newBoostJob.value = boostJob.getValue();
                newBoostJob.diff = boostJob.getDiff();
                newBoostJob.content = boostJob.getContentHex();
                newBoostJob.contentutf8 = boostJob.getContentString();
                newBoostJob.category = boostJob.getCategoryHex();
                newBoostJob.categoryutf8 = boostJob.getCategoryString();
                newBoostJob.tag = boostJob.getTagHex();
                newBoostJob.tagutf8 = boostJob.getTagString();
                newBoostJob.additionaldata = boostJob.getAdditionalDataHex();
                newBoostJob.additionaldatautf8 = boostJob.getAdditionalDataString();
                newBoostJob.usernonce = boostJob.getUserNonceHex();
                newBoostJob.spends_parenttxid = paymentInfo.txid;
                newBoostJob.spends_parentvout = paymentInfo.index;
                boostJobEntity = newBoostJob;
            }
            boostJobEntities.push(boostJobEntity);
        }
        try {
            await this.boostJobRepo.save(boostJobEntities);
        } catch (ex) {
            console.log('ex', ex);
            throw ex;
        }
        // Get the first txid, since they are all the same
        return this.getRandomBoostJobStatus.run({ txid: boostJobs[0].getTxid() })
    }
}
