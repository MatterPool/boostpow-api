

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import * as boost from '@matterpool/boostpow-js';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJob } from '../../models/BoostJob';
import * as bsv from 'bsv';
import { GetRandomBoostFeeQuote } from './GetRandomBoostFeeQuote';
import { BitcoinUtils } from '../../../helpers/bitcoin-utils';
import { ServiceError } from '../errors/ServiceError';
import { GetRandomBoostJobStatus } from './GetRandomBoostJobStatus';
import * as axios from 'axios';

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
        const tx = new bsv.Transaction(rawtx);
        if (await this.checkIfTransactionExists(tx.hash)) {
            console.log('checkIfTransactionExists is true', tx.hash);
            return true;
        }
        console.log('checkIfTransactionExists is false now about to try broadcasting...', tx.hash);
        try {
            const response = await axios.default.post(`${process.env.MAPI_ENDPOINT}/mapi/tx`, { rawtx }, { headers: {
                'content-type': 'application/json',
                'checkstatus': true, // Set check status to force checking tx instead of blindly broadcasting if it's not needed
            }});

            if (response && response.data  && response.data.payload && response.data.payload.returnResult === 'success') {
                console.log('ensureTransactionBroadcasted true success', response);
                return true;
            // tslint:disable-next-line: curly
            } if (response && response.data.payload && response.data.payload.returnResult === 'failure' &&
                response.data.payload.resultDescription === 'ERROR: Transaction already in the mempool') {
                console.log('ensureTransactionBroadcasted true success', response);
                return true;
            } else {
                console.log('ensureTransactionBroadcasted not true', response);
                return false;
            }
        } catch (err) {
            console.log('ensureTransactionBroadcasted err', err);
            // throw err;
            return false;
        }
    }

    private async checkIfTransactionExists(txid: string) {
        try {
            const response = await axios.default.get(`${process.env.MAPI_ENDPOINT}/mapi/tx/${txid}`, { headers: {
                'content-type': 'application/json',
                'checkstatus': true, // Set check status to force checking tx instead of blindly broadcasting if it's not needed
            }});

            if (response && response.data &&  response.data.payload && response.data.payload.returnResult === 'success') {
                console.log('checkIfTransactionExists TRUE SUCCESS', txid, response);
                return true;
            } else {
                console.log('checkIfTransactionExists FALSE ', txid, response);
                return false;
            }
        } catch (err) {
            console.log('checkIfTransactionExist exception', txid, err);
            throw err;
        }
    }
    public createTransaction(
        content: string,
        category: string,
        tag: string,
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
                content: content ? content : undefined,
                category: category ? category : undefined,
                tag: tag ? tag : undefined,
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

    public async run(params: {rawtx: string, numOutputs: number, diff: number, content?: string, category?: string, tag?: string}): Promise<any> {
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
        if (contentNormalized && !TXID_REGEX.test(contentNormalized)) {
            contentNormalized = Buffer.from(contentNormalized, 'utf8');
        }

        let categoryNormalized: any = params.category;
        const CAT_REGEX = new RegExp('^[0-9a-fA-F]{8}$');
        if (categoryNormalized && !CAT_REGEX.test(categoryNormalized)) {
            categoryNormalized = Buffer.from(categoryNormalized, 'utf8');
        }

        let tagNormalized: any = params.tag;
        const TTAG_REGEX = new RegExp('^[0-9a-fA-F]{40}$');
        if (tagNormalized && !TTAG_REGEX.test(tagNormalized)) {
            tagNormalized = Buffer.from(tagNormalized, 'utf8');
        }

        // tslint:disable-next-line: max-line-length
        const boostJobsTx = this.createTransaction(contentNormalized, categoryNormalized, tagNormalized, feeMenu, params.numOutputs, params.diff, paymentInfo, this.getServiceKey());
        if (!(await this.ensureTransactionBroadcasted(params.rawtx))) {
            throw new ClientError(500, 'Failed to broadcast');
        }
        if (!(await this.ensureTransactionBroadcasted(boostJobsTx))) {
            throw new ClientError(500, 'Failed to broadcast2');
        }
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
