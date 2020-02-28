import { BoostPowStringModel } from 'boostpow-js/dist/boost-pow-string-model';
import { BoostPowMetadataModel } from 'boostpow-js/dist/boost-pow-metadata-model';

export interface GraphSearchResultItem {
    boostJobId?: string;
    boostPowString?: BoostPowStringModel;
    boostPowMetadata?: BoostPowMetadataModel;
    boostPowSignal?: BoostPowStringModel
}
