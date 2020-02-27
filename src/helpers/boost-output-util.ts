import bsv from 'bsv';

export function createBoostOutput(
    category: string,
    contentHash: string,
    target: string,
    tags: string[],
    nonce: number,
    metadata: any
): bsv.Script {
    const additionalInfo = {
        tags: tags,
        metdata: metadata
    };

    if (!category) {
        category = '00';
    }

    if (!nonce) {
        nonce = 4432;
    }

    const encodedAdditionalInfo = Buffer.from(additionalInfo.toString());
    let asm = `01 ${contentHash} ${target} ${category} ${nonce} ${encodedAdditionalInfo.toString('hex')}
    08 OP_PICK OP_SIZE 01 OP_EQUALVERIFY
    06 OP_ROLL OP_DUP OP_TOALTSTACK OP_ROT
    04 OP_PICK
    OP_SIZE 04 OP_EQUALVERIFY 03 OP_SPLIT
    OP_DUP 03 OP_GREATERTHANOREQUAL OP_VERIFY
    OP_DUP 20 OP_LESSTHANOREQUAL OP_VERIFY
    OP_TOALTSTACK
    0000000000000000000000000000000000000000000000000000000000 OP_CAT
    OP_FROMALTSTACK 03 OP_SUB OP_RSHIFT
    OP_TOALTSTACK
    07 OP_ROLL OP_SIZE 08 OP_EQUALVERIFY
    04 OP_SPLIT OP_TOALTSTACK
    OP_CAT OP_ROT OP_CAT OP_CAT OP_CAT OP_HASH256
    OP_SWAP OP_CAT OP_CAT OP_CAT OP_SWAP OP_CAT
    OP_FROMALTSTACK OP_CAT OP_FROMALTSTACK OP_CAT
    OP_HASH256 OP_FROMALTSTACK OP_LESSTHAN OP_VERIFY
    OP_DUP OP_HASH256 OP_FROMALTSTACK OP_EQUALVERIFY OP_CHECKSIG`;

    asm = asm.replace(/\r?\n|\r/g, '').replace(/\s+/g, ' ');

    return asm;
}
