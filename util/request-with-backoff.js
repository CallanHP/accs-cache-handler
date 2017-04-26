/*
 * Utility for adding retries to caching requests, based upon the concept described in the
 * documentation here:
 * http://docs.oracle.com/en/cloud/paas/app-container-cloud/cache/handling-connection-exceptions-retries.html
 *
 * Apparently during cache scaling, connectivity might be interuppted, and according to the docs,
 * 'testing suggests that connectivity exceptions occur in a window of about 5 seconds at most'.
 * As a result of this, it makes sense to retry caching failures, as we might just have a hiccup during
 * cache auto-scaling.
 * 
 * Retry behaviour is tunable, but based upon the 5-second result mentioned in the docs, we will just
 * use a linear backoff, with a base retry of 225ms and a multiplier of 2, resulting in failure after 
 * a little more than 7 seconds (and 5 retries).
 * 3600 -> 1800 -> 900 -> 450 -> 225 ms
 */
var request = require('request');

const BASE_RETRY = 225;
const MAX_RETRIES = 5;

const WARN_CONN_FAILED = "MAX_RETRIES met for request backoff! Caching service might be down!";

var requestWithBackoff = function(options, callback){
  _makeRequest(0, BASE_RETRY, options, callback);
};

function _makeRequest(retryCount, delay, options, callback){
  request(options, function(err, response, body){
    //Effectively a check for unknown host and connection error
    if(err && ((err.code == 'ENOTFOUND' && err.syscall == 'getaddrinfo') || err.syscall == 'connect')){
      if(retryCount < MAX_RETRIES){
        setTimeout(function(){_makeRequest(retryCount+1, delay*2, options, callback);}, delay);
        return;
      }
      //Return our error back. This isn't a temporary issue
      console.error(WARN_CONN_FAILED);
      callback(err, response, body);
      return;
    }
    callback(err, response, body);
  });
}

module.exports = requestWithBackoff;