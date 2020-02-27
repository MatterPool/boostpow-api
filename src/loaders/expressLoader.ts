import { MicroframeworkLoader, MicroframeworkSettings } from 'microframework-w3tec';
import { env } from '../env';
import "reflect-metadata";
import { useExpressServer } from "routing-controllers";
const pretty = require('express-prettify');
const bodyParser = require('body-parser');
const responseSize = require('express-response-size');
const cookieSession = require('cookie-session');

export const expressLoader: MicroframeworkLoader = (settings: MicroframeworkSettings | undefined) => {
    if (settings) {
        // const connection = settings.getData('connection');
        /**
         * We create a new express server instance.
         * We could have also use useExpressServer here to attach controllers to an existing express instance.
         */

        const express = require("express"); // or you can import it if you have installed typings
        const expressApp = express(); // your created express server
        expressApp.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)

        const getDurationInMilliseconds = (start) => {
            const NS_PER_SEC = 1e9;
            const NS_TO_MS = 1e6;
            const diff = process.hrtime(start);

            return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
        };

        expressApp.use((req, res, next) => {
            const api_key = req.headers['api_key'];
            console.log(`${req.method} ${req.originalUrl} ${req.connection.remoteAddress} api_key: ${api_key} [STARTED]`);
            const start = process.hrtime();

            res.on('finish', () => {
                const durationInMilliseconds = getDurationInMilliseconds (start);

                console.log(`${req.method} ${req.originalUrl} ${req.connection.remoteAddress} [FINISHED] ${durationInMilliseconds .toLocaleString()} ms`);
                if (durationInMilliseconds > 5000) {
                    try {
                        if (req.body && req.body !== '') {
                            console.log(`Long running finish: ${JSON.stringify(req.body)}`);
                        }
                    } catch (ex) {
                        console.log('.', ex);
                    }
                }
                try {
                    if (req.body && req.body !== '') {
                        console.log(`BODYPARAMS: ${JSON.stringify(req.body)}`);
                    }
                } catch (ex) {
                    console.log('excp in expreess middle ware', ex);
                }
            });

            res.on('close', () => {

                const durationInMilliseconds = getDurationInMilliseconds (start);

                if (durationInMilliseconds > 5000) {
                    try {
                        if (req.body && req.body !== '') {
                            console.log(`long running close: ${JSON.stringify(req.body)}`);
                        }
                    } catch (ex) {
                        console.log('.', ex);
                    }
                }
                console.log(`${req.method} ${req.originalUrl} ${req.connection.remoteAddress} [CLOSED] ${durationInMilliseconds .toLocaleString()} ms`);
            });

            next();
        });

        expressApp.use(responseSize((req, res, size) => {
            const stat = `${req.method} - ${req.url.replace(/[:.]/g, '')}`;
            // Log only larger than 1MB
            if (size < 1000000) {
                return;
            }
            const convertedSize = Math.round(size / 1024);
            const outputSize = `${convertedSize}kb REQUESTSIZE`;
            try {
                if (req.body && req.body !== '') {
                    console.log(`${req.method} ${req.originalUrl} ${req.connection.remoteAddress} ${stat}, ${outputSize} MAXSIZEPARAMS: ${JSON.stringify(req.body)}`);
                }
            } catch (ex) {
                console.log(ex);
            }
        }));

        expressApp.use(bodyParser.json({limit: '5mb'}));
        expressApp.use(bodyParser.urlencoded({ extended: true }));
        expressApp.use(pretty({ always: true }));

        expressApp.use(cookieSession({
            name: 'boostapisession',
            keys: ['ac2b5dc962cad8eb2fdc0c2eebfdea1e91cffc838138c2116bc5d4b6250f9c39b8776dbdca2e638b556b738bce25dad21ed327f988539e9726142734961c5e0c'],
            secret: 'ac2b5dc962cad8eb2fdc0c2eeb1dea1e91cffc831838c2116bc5d2b6250f9c39b8776dbdca2e638b556b738bce35ead21ed327f988539e9726142734961c5e0c',
            // Cookie Options
            maxAge: 24 * 60 * 60 * 1000 * 365 // 1 year
        }))


        useExpressServer(expressApp, { // register created express server in routing-controllers
            cors: false,
            classTransformer: true,
            routePrefix: env.app.routePrefix,
            defaultErrorHandler: false,
            /**
             * We can add options about how routing-controllers should configure itself.
             * Here we specify what controllers should be registered in our express server.
             */
            controllers: env.app.dirs.controllers,
            middlewares: env.app.dirs.middlewares,
            interceptors: env.app.dirs.interceptors,
        });

        // Run application to listen on given port
        if (!env.isTest) {
            const server = expressApp.listen(env.app.port);
            settings.setData('express_server', server);
        }
        // Here we can set the data for other loaders
        settings.setData('express_app', expressApp);
    }
};
