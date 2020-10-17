import { BoostJob } from './BoostJob';
import { BoostPowJob } from '@matterpool/boostpow-js';

export class BoostJobStatus {
    public static validateAndSerialize(boostJobEntity: BoostJob, expanded = true, debug = true) {
        const boostJob = BoostPowJob.fromRawTransaction(boostJobEntity.rawtx, boostJobEntity.vout);
        if (expanded) {
            const obj = {
                // boostPowSignal: boostJobEntity.powmetadata ? boostJobEntity.powstring + boostJobEntity.powmetadata : boostJobEntity.powstring,
                boostPowString: boostJobEntity.powstring ? boostJobEntity.powstring : null,
                boostPowMetadata: boostJobEntity.powmetadata ? boostJobEntity.powmetadata : null,
                boostHash: boostJobEntity.boosthash ? boostJobEntity.boosthash : null,
                boostJobId: boostJob.getTxid() + '.' + boostJob.getVout(),
                boostJobProofId: boostJobEntity.spenttxid ? boostJobEntity.spenttxid + '.' + boostJobEntity.spentvout : null,
                boostJob: {
                    boostJobId: boostJob.getTxid() + '.' + boostJob.getVout(),
                    createdTime: boostJobEntity.inserted_at,
                    txid: boostJob ? boostJob.getTxid() : null,
                    vout: boostJob ? boostJob.getVout() : null,
                    scripthash: boostJob ? boostJob.getScriptHash() : null,
                    value: boostJob ? boostJob.getValue() : null,
                    diff: boostJob ? boostJob.getDiff() : null,
                    time: boostJobEntity ? boostJobEntity.time : null,
                    // rawtx: boostJobEntity.rawtx,
                    spentTxid: boostJobEntity.spenttxid ? boostJobEntity.spenttxid : null,
                    spentVout: boostJobEntity.spentvout === undefined ? 0 : boostJobEntity.spentvout,
                    spentRawtx: boostJobEntity.spentrawtx ? boostJobEntity.spentrawtx : null,
                    spentScripthash: boostJobEntity.spentscripthash ? boostJobEntity.spentscripthash : null,
                },
            };

            if (debug) {
                return Object.assign({}, obj, {
                    boostData: {
                        categoryutf8: boostJobEntity.categoryutf8,
                        category: boostJobEntity.category,
                        contentutf8: boostJobEntity.contentutf8,
                        content: boostJobEntity.content,
                        tagutf8: boostJobEntity.tagutf8,
                        tag: boostJobEntity.tag,
                        usernonce: boostJobEntity.usernonce,
                        additionaldatautf8: boostJobEntity.additionaldatautf8,
                        additionaldata: boostJobEntity.additionaldata,
                    }
                });
            }
            return obj;
        } else {
            return {
                // boostPowSignal: boostJobEntity.powmetadata ? boostJobEntity.powstring + boostJobEntity.powmetadata : boostJobEntity.powstring,
                boostPowString: boostJobEntity.powstring ? boostJobEntity.powstring : null,
                boostPowMetadata: boostJobEntity.powmetadata ? boostJobEntity.powmetadata : null,
                boostHash: boostJobEntity.boosthash ? boostJobEntity.boosthash : null,
                boostJobId: boostJob.getTxid() + '.' + boostJob.getVout(),
                boostJobProofId: boostJobEntity.spenttxid ? boostJobEntity.spenttxid + '.' + boostJobEntity.spentvout : null,
            }
        }
    }
    public static validateAndSerializeUnmined(boostJobEntity: BoostJob, vout: number = 0, expanded = true) {
        const boostJob = BoostPowJob.fromRawTransaction(boostJobEntity.rawtx, vout);
        if (expanded) {
            return {
                boostJobId: boostJob.getTxid() + '.' + boostJob.getVout(),
                boostJob: {
                    boostJobId: boostJob.getTxid() + '.' + boostJob.getVout(),
                    createdTime: boostJobEntity.inserted_at,
                    txid: boostJob ? boostJob.getTxid() : null,
                    vout: boostJob ? boostJob.getVout() : null,
                    scripthash: boostJob ? boostJob.getScriptHash() : null,
                    value: boostJob ? boostJob.getValue() : null,
                    diff: boostJob ? boostJob.getDiff() : null,
                    rawtx: boostJobEntity.rawtx,
                    spentTxid: boostJobEntity.spenttxid ? boostJobEntity.spenttxid : null,
                    spentVout: boostJobEntity.spentvout === undefined ? 0 : boostJobEntity.spentvout,
                    spentRawtx: boostJobEntity.spentrawtx ? boostJobEntity.spentrawtx : null,
                    spentScripthash: boostJobEntity.spentscripthash ? boostJobEntity.spentscripthash : null,
                },
            }
        } else {
            return {
                boostJobId: boostJob.getTxid() + '.' + boostJob.getVout(),
            }
        }
    }
}
