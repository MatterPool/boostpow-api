import * as express from 'express';
import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';

@Middleware({ type: 'before' })
export class CorsMiddleware implements ExpressMiddlewareInterface {

    public use(req: express.Request, res: express.Response, next: express.NextFunction): any {
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header("Access-Control-Allow-Origin", process.env.CORS_ALLOWED_ORIGIN);
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('Access-Control-Allow-Methods', 'POST,GET,PUT,HEAD,DELETE,OPTIONS');
        next();
    }
}
