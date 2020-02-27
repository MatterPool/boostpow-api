"use strict";
const defaults = require("defaults");
const MemoryStore = require("./memory-store");

function getDelayRules(whitelistRates, api_key) {
  if (whitelistRates[api_key]) {
    return whitelistRates[api_key]
  }
  return null;
}

function SlowDown(options) {
  options = defaults(options, {
    whitelist: [],
    // window, delay, and max apply per-key unless global is set to true
    windowMs: 60 * 1000, // milliseconds - how long to keep records of requests in memory
    delayAfter: 1, // how many requests to allow through before starting to delay responses
    delayMs: 1000, // milliseconds - base delay applied to the response - multiplied by number of recent hits for the same key.
    maxDelayMs: Infinity, // milliseconds - maximum delay to be applied to the response, regardless the request count. Infinity means that the delay will grow continuously and unboundedly
    skipFailedRequests: false, // Do not count failed requests (status >= 400)
    skipSuccessfulRequests: false, // Do not count successful requests (status < 400)
    // allows to create custom keys (by default user IP is used)
    whitelistRates: {}, // { '123' : { 'time window', 'delay after', 'stepSize' }}
    keyGenerator: function(whitelistRates, req /*, res*/) {
      // If no API key, then default to limit by IP
      let api_key = req.headers['api_key'] && req.headers['api_key'] !== '' ? req.headers['api_key'] : req.query.api_key;
      if (!api_key || api_key === '') {
        console.log('NO API KEY');
        return req.ip;
      }
      // If not specific white list for API key, then limit by IP
      const delayRules = getDelayRules(whitelistRates, api_key)
      if (!delayRules) {
        console.log('NO DELAY RULES');
        return req.ip;
      }
      console.log('VALID KEY');
      return api_key
    },
    skip: function(/*req, res*/) {
      return false;
    },
    onLimitReached: function(/*req, res, optionsUsed*/) {}
  });

  // store to use for persisting rate limit data
  options.store = options.store || new MemoryStore(options.windowMs, options.whitelistRates);

  // ensure that the store has the incr method
  if (
    typeof options.store.incr !== "function" ||
    typeof options.store.resetKey !== "function" ||
    (options.skipFailedRequests &&
      typeof options.store.decrement !== "function")
  ) {
    throw new Error("The store is not valid.");
  }
/*
  function isWhitelist(req) {
    for (const apiKey of options.whitelist) {
      if (req.query.api_key === apiKey ||
        req.headers['api_key'] === apiKey) {
        return true;
      }
    }
    return false;
  }
*/
  function slowDown(req, res, next) {
    if (options.skip(req, res)) {
      return next();
    }
    const key = options.keyGenerator(options.whitelistRates, req, res);

    options.store.incr(key, function(err, current, resetTime) {
      if (err) {
        return next(err);
      }
      let rateInfo = options.whitelistRates[key];
      let delay = 0;

      const delayAfter = rateInfo ? rateInfo.delayAfter : options.delayAfter;
      const delayMs = rateInfo ? rateInfo.delayMs : options.delayMs;
      if (current > delayAfter) {
        const unboundedDelay = (current - delayAfter) * delayMs;
        delay = Math.min(unboundedDelay, options.maxDelayMs);
      }

      req.slowDown = {
        limit: delayAfter,
        current: current,
        remaining: Math.max(delayAfter - current, 0),
        resetTime: resetTime,
        delay: delay
      };
      if (current - 1 === delayAfter) {
        options.onLimitReached(req, res, options, key, rateInfo);
      }

      if (options.skipFailedRequests || options.skipSuccessfulRequests) {
        let decremented = false;
        const decrementKey = () => {
          if (!decremented) {
            options.store.decrement(key);
            decremented = true;
          }
        };

        if (options.skipFailedRequests) {
          res.on("finish", function() {
            if (res.statusCode >= 400) {
              decrementKey();
            }
          });

          res.on("close", () => {
            if (!res.finished) {
              decrementKey();
            }
          });

          res.on("error", () => decrementKey());
        }

        if (options.skipSuccessfulRequests) {
          res.on("finish", function() {
            if (res.statusCode < 400) {
              options.store.decrement(key);
            }
          });
        }
      }

      if (delay !== 0) {
        return setTimeout(next, delay);
      }

      next();
    });
  }

  slowDown.resetKey = options.store.resetKey.bind(options.store);

  return slowDown;
}

module.exports = SlowDown;
