import { MicroframeworkLoader, MicroframeworkSettings } from 'microframework-w3tec';
import "reflect-metadata";
import { BoostBlockchainMonitor } from '../api/models/boost-blockchain-monitor';

export const blockchainScannerLoader: MicroframeworkLoader = async (settings: MicroframeworkSettings | undefined) => {
    if (settings) {
        const monitor = await BoostBlockchainMonitor.instance();
        console.log('Starting blockchain monitor...', monitor);
        settings.setData('blockchainMonitor', monitor);
    }
};
