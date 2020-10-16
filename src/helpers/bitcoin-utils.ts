
import * as bitcoin from 'bsv';

export class BitcoinUtils {
    public static getPaymentAddress(num, xprv) {
        const hdPrivateKey = new bitcoin.HDPrivateKey(xprv);
        const derivePath = `m/44'/0'/0'/0/${num}`;
        const child = hdPrivateKey.deriveChild(derivePath);
        return new bitcoin.Address(child.publicKey);
    }
    public static getPaymentAddressKey(num, xprv) {
        const hdPrivateKey = new bitcoin.HDPrivateKey(xprv);
        const derivePath = `m/44'/0'/0'/0/${num}`;
        const child = hdPrivateKey.deriveChild(derivePath);
        return new bitcoin.PrivateKey(child.privateKey);
    }
}
