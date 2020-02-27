"use strict";

function calculateNextResetTime(windowMs) {
  const d = new Date();
  d.setMilliseconds(d.getMilliseconds() + windowMs);
  return d;
}

function MemoryStore(windowMs, whitelistRates) {
  let hits = {};


  this.incr = function(key, cb) {
    if (hits[key]) {
      hits[key]++;
    } else {
      hits[key] = 1;
    }

    if (whitelistRates[key]) {
      console.log('INCR WITH API KEY', whitelistRates[key].windowMs)
      let resetTime = calculateNextResetTime(whitelistRates[key].windowMs);
      cb(null, hits[key], resetTime);
    } else {
      console.log('INCR', windowMs)
      let resetTime = calculateNextResetTime(windowMs);
      cb(null, hits[key], resetTime);
    }

  };

  this.decrement = function(key) {
    if (hits[key]) {
      hits[key]--;
    }
  };

  // export an API to allow hits from one IP to be reset
  this.resetKey = function(key) {
    delete hits[key];
    delete resetTime[key];
  };
  const intervalmap = {};

  // export an API to allow hits all IPs to be reset
  this.resetAllExceptWhitelist = function() {
    for (const i in hits) {
      if (!hits.hasOwnProperty(i)) {
        continue;
      }
      if (intervalmap[i]) {
        continue;
      }
      delete hits[i];

    }
  };


  this.checkForResets = () => {
    for (const i in intervalmap) {
      if (!intervalmap.hasOwnProperty(i)) {
        continue;
      }
      intervalmap[i].elapsed += 1000;

      if (intervalmap[i].elapsed >= intervalmap[i].windowMs) {
        intervalmap[i].elapsed = 0;
        delete hits[intervalmap[i].key];
        // delete resetTime[intervalmap[i].key];
      }
    }
  }


  for (const c in whitelistRates) {
    if (!whitelistRates.hasOwnProperty(c)) {
      continue;
    }
    intervalmap[c] = {
        key: c,
        elapsed: 0,
        windowMs: whitelistRates[c].windowMs
    }
  }

  const interval = setInterval(this.checkForResets, 1000);

  // simply reset ALL hits every windowMs
  const interval2 = setInterval(this.resetAllExceptWhitelist, windowMs);
  if (interval2.unref) {
    interval2.unref();
  }

}

module.exports = MemoryStore;
