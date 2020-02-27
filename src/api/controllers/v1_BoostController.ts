import {
    JsonController, Get, Req, Res, CurrentUser, Post, BodyParam, Param, QueryParam
} from 'routing-controllers';
import { CreateBoostWorkOrder } from '../services/use_cases/boost/CreateBoostWorkOrder';
import { SubmitBoostWorkOrder } from '../services/use_cases/boost/SubmitBoostWorkOrder';


@JsonController()
export class BoostController {

    constructor(
        private createBoostWorkOrder: CreateBoostWorkOrder,
        private submitBoostWorkOrder: SubmitBoostWorkOrder,
    ) {
        //
    }

    @Post('/v1/bsv/boost/quote')
    public async postBoost(
        @Req() req,
        @Res() res: any,
        @CurrentUser({ required: false }) user: any,
        @BodyParam('contentHash') contentHash: string,
        @BodyParam('category') category: string,
        @BodyParam('target') target: string,
        @BodyParam('tags') tags: string[],
        @BodyParam('metadata') metadata: any,
        @BodyParam('nonce') nonce: number,

    ) {

        return this.createBoostWorkOrder.run({
            category,
            contentHash,
            target,
            tags,
            nonce,
            metadata,
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }

    @Get('/v1/bsv/boost/quote')
    public async getQuoteBoost(
        @Req() req,
        @Res() res: any,
        @CurrentUser({ required: false }) user: any,
        @QueryParam('contentHash') contentHash: string,
        @QueryParam('category') category: string,
        @QueryParam('target') target: string,
        @QueryParam('tags') tags: string[],
        @QueryParam('metadata') metadata: any,
        @QueryParam('nonce') nonce: number,
    ) {

        return this.createBoostWorkOrder.run({
            category,
            contentHash,
            target,
            tags,
            nonce,
            metadata,
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }

    @Post('/v1/bsv/boost/quote/:boostId/submit')
    public async submitPost(
        @Req() req,
        @Res() res: any,
        @CurrentUser({ required: false }) user: any,
        @Param('boostId') boostId: string,
        @BodyParam('rawtx') rawtx: string,
    ) {

        return this.submitBoostWorkOrder.run({
            boostId,
            rawtx
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
}
