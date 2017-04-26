/* 
 * Cache Handler for Node.js applications using Application Container Cloud Service
 * By: Callan Howell-Pavia (callan.howell-pavia@oracle.com)
 *
 * This implementation is designed to provide the a simple caching interface, in 
 * typical node style, using callbacks.
 * Internally the cache uses byte arrays (octet streams), so focus is upon coercing
 * the cached objects into appropriate formats.
 */
var request = require('./util/request-with-backoff.js');
//var request = require('request');

var MockCache = require('./mock_cache_handler.js');
var multivalue = require("./util/multivalue");

const WARN_NO_CACHE_HOST = "Internal Caching URL is not set. Falling back on using a local hashmap instead.";
const WARN_NO_CACHE_BINDING = "If this application is running on ACCS, ensure that you have correctly bound to a caching service.";

//Retrieve the cache url set by ACCS
var CCSHOST = process.env.CACHING_INTERNAL_CACHE_URL;

function Cache(cacheName){
  //Fallback on Mock cache if it doesn't look like we are on ACCS
  if(!process.env.CACHING_INTERNAL_CACHE_URL){
    console.warn(WARN_NO_CACHE_HOST);
    //HOSTNAME and PORT are set by default on ACCS, so we will use them to make a guess about whether
    //the binding is simply not set.
    if(process.env.HOSTNAME && process.env.PORT){
      console.warn(WARN_NO_CACHE_BINDING);
    }
    return new MockCache(cacheName);
  }
	this._cacheName = encodeURIComponent(cacheName);
	this._cacheURL = "http://" +CCSHOST +":8080/ccs/" +this._cacheName;
}

//Retreive an entry from the cache
Cache.prototype.get = function(key, objType, callback){
  if(key == undefined || typeof key == 'function'){
    throw new SyntaxError("key is a required parameter for get!");
  }
	if(typeof objType == 'function'){
		callback = objType;
		objType = null;
	}
	if(typeof key == 'number'){
		key = String(key);
	}
	if(typeof key != 'string'){
		throw new TypeError("Caching keys must be strings or numbers!");
	}
	if(objType && typeof objType != 'string'){
		throw new TypeError("Object hints for getting a cache entry must be a valid javascript object type, e.g. 'string'");
	}
	//Retrieve the entry from the cache
	var options = { url: this._cacheURL +"/" +encodeURIComponent(key),
      					  method: 'GET'
      				  };
	request(options, function(err, response, body){
    if(response && response.statusCode == 404){
      //respond with a null object
      callback(null, null);
      return;
    }
		if(err){
			callback(err);
			return;
		}
		//Coerce the response into appropriate format
    try{
      var ret = _coerceObjectType(body, objType);
    }catch(ex){
      callback(ex, null);
      return;
    }
    callback(null, ret);
	});
	
}

//Add an entry to the cache
Cache.prototype.put = function(key, val, ttl, isBuffer, callback) {
	if(key == undefined || val == undefined || typeof key == 'function' || typeof val == 'function'){
    throw new SyntaxError("key and val are required parameters for put!");
  }
  if(typeof ttl == 'function'){
		callback = ttl;
		ttl = null;
		isBuffer = false;
	}
  if(typeof ttl == 'boolean'){
    if(typeof isBuffer == 'function'){
      callback = isBuffer;
    }
    isBuffer = ttl;
    ttl = null;
  }
  if(typeof isBuffer == 'function'){
    callback = isBuffer;
    isBuffer = false;
  }
	if(typeof key == 'number'){
		key = String(key);
	}
	if(typeof key != 'string'){
		throw new TypeError("Caching keys must be strings or numbers!");
	}
	if(ttl && typeof ttl != 'number'){
		throw new TypeError("Time to live for cache entries must a positive number!");
	}
	//Assemble the call to add the entry to the cache
	var options = { url: this._cacheURL +"/" +encodeURIComponent(key),
        					method: 'PUT',
        					headers: {
        						'Content-Type': 'application/octet-stream'
        					}
        				};
	if(ttl && ttl > 0){
		options.qs = {'ttl':ttl};
	}
	//Serialize the body if appropriate
	if(typeof val == 'string' || Buffer.isBuffer(val)){
    options.body = val;
  }else{
    options.body = JSON.stringify(val);
  }
	request(options, function(err, response, body){
		if(err){
			callback(err);
			return;
		}
		callback(null);
	});
};

//Add an entry to the cache if the key is available, otherwise reject.
Cache.prototype.putIfAbsent = function(key, val, ttl, isBuffer, callback) {
  if(key == undefined || val == undefined || typeof key == 'function' || typeof val == 'function'){
    throw new SyntaxError("key and val are required parameters for putIfAbsent!");
  }
	if(typeof ttl == 'function'){
    callback = ttl;
    ttl = null;
    isBuffer = false;
  }
  if(typeof ttl == 'boolean'){
    if(typeof isBuffer == 'function'){
      callback = isBuffer;
    }
    isBuffer = ttl;
    ttl = null;
  }
  if(typeof isBuffer == 'function'){
    callback = isBuffer;
    isBuffer = false;
  }
	if(typeof key == 'number'){
		key = String(key);
	}
	if(typeof key != 'string'){
		throw new TypeError("Caching keys must be strings or numbers!");
	}
	if(ttl && typeof ttl != 'number'){
		throw new TypeError("Time to live for cache entries must a positive number!");
	}
	//Assemble the call to add the entry to the cache
  //Return old is required, as in my testing 
	var options = { url: this._cacheURL +"/" +encodeURIComponent(key),
        					method: 'POST',
        					headers: {
        						'Content-Type': 'application/octet-stream',
        						'X-Method': 'putIfAbsent'
        					},
                  qs: {
                    'returnOld':'true'
                  }
				        };
	if(ttl && ttl > 0){
		options.qs.ttl = ttl;
	}
	//Serialize the body if appropriate
	if(typeof val == 'string' || Buffer.isBuffer(val)){
		options.body = val;
	}else{
		options.body = JSON.stringify(val);
	}
	request(options, function(err, response, body){
		if(response && response.statusCode == 409){
			callback(new Error('Did not insert entry, key already exists.'));
			return;
		}
		if(err){
			callback(err);
			return;
		}
		callback(null);
	});
};

Cache.prototype.replace = function(key, val, oldVal, ttl, callback) {
  if(key == undefined || val == undefined || oldVal == undefined
    || typeof key == 'function' || typeof val == 'function' || typeof oldVal == 'function'){
    throw new SyntaxError("key, val and oldVal are required parameters for replace!");
  }
  if(typeof ttl == 'function'){
    callback = ttl;
    ttl = null;
  }
  if(typeof key == 'number'){
    key = String(key);
  }
  if(typeof key != 'string'){
    throw new TypeError("Caching keys must be strings or numbers!");
  }
  if(ttl && typeof ttl != 'number'){
    throw new TypeError("Time to live for cache entries must a positive number!");
  }
  //Assemble the call to add the entry to the cache
  var options = { url: this._cacheURL +"/" +encodeURIComponent(key),
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-multivalue-octet-stream',
                    'X-Method': 'replaceValue'
                  }
                };
  if(ttl && ttl > 0){
    options.qs = {'ttl':ttl};
  }
  //Assemble the required multi-value to pass
  var mvBody = [];
  //Serialize the body if appropriate
  if(typeof oldVal == 'string' || Buffer.isBuffer(oldVal)){
    mvBody.push(oldVal);
  }else{
    mvBody.push(JSON.stringify(oldVal));
  }
  if(typeof val == 'string' || Buffer.isBuffer(val)){
    mvBody.push(val);
  }else{
    mvBody.push(JSON.stringify(val));
  }
  options.body = multivalue.encode(mvBody);
  request(options, function(err, response, body){
    if(response && response.statusCode == 409){
      callback(new Error('Did not insert entry, cached value does not equal oldVal supplied.'));
      return;
    }
    if(err){
      callback(err);
      return;
    }
    callback(null);
  });
};

//Delete an entry from the cache
Cache.prototype.delete = function(key, callback) {
  if(key == undefined || typeof key == 'function'){
    throw new SyntaxError("key is a required parameter for delete!");
  }
	if(typeof key == 'number'){
		key = String(key);
	}
	if(typeof key != 'string'){
		throw new TypeError("Caching keys must be strings or numbers!");
	}
	//Assemble the call to delete the entry from the cache
	var options = { url: this._cacheURL +"/" +encodeURIComponent(key),
					        method: 'DELETE'
				        };
	request(options, function(err, response, body){
		if(err){
			callback(err);
			return;
		}
		callback(null);
	});
};

//Clear the whole cache
Cache.prototype.clear = function(callback) {
	var options = { url: this._cacheURL,
        					method: 'DELETE'
        				};
	request(options, function(err, response, body){
		if(err){
			callback(err);
			return;
		}
		callback(null);
	});
};

/*Get the cache stats
 *Response object has the following fields:
 *'cache' - cache name
 *'count' - number of objects in the cache
 *'size' - size of the cache (in bytes?)
 */
Cache.prototype.stats = function(callback){
	var options = { url: this._cacheURL,
        					method: 'GET'
        			  };
  var self = this;
	request(options, function(err, response, body){
		if(err){
			callback(err);
			return;
		}
    var bodyJSON = JSON.parse(body);
		var cacheInfo = { cache: self._cacheName,
        						  count: bodyJSON.count,
        						  size: bodyJSON.size
  		          		};
		callback(null, cacheInfo);
	});
};

/*
 * Internal method for coercing the response back into the expected format.
 * Takes an 'object hint' which defines the expected response format,
 * but if one is not provided, makes a best-guess, based upon what the response
 * looks like.
 */
function _coerceObjectType(obj, objHint){
  if(objHint){
    switch(objHint){
      case 'string':
        //Response that comes back is application/octet-stream, which we will return raw
        return obj;
      case 'buffer':
        return Buffer.from(obj, 'utf8');
      case 'number':
        var num = Number(obj);
        if(isNaN(num)){
          throw new TypeError("'number was requested as a type, but result is NaN!");
        }
        return num;
      case 'array':
        try{
          var pObj = JSON.parse(obj);
          if(pObj[0] == undefined){
            //Is an object, not an array, so we will construct an array of just this object
            return new Array(pObj);
          }
          return pObj;
        }catch(ex){
          //If it fails, then it is likely a single string, lets coerce it to an array
          return new Array(obj);
        }
      case 'boolean':
        //Today's javascript fun-fact: 'false' is truthy!
        if(obj == 'false'){
          return false;
        }
        return Boolean(obj);
      case 'object':
         try{
          var pObj = JSON.parse(obj);
          return pObj;
        }catch(ex){
          //If it fails, then just throw back the object
          return obj;
        }
        break;
    }
  }else{
    return _bestGuessObject(obj);
  }
}

function _bestGuessObject(obj){
  //JSON.parse is a very powerful function...
  try{
    var pObj = JSON.parse(obj);
    return pObj;
  }catch(ex){
    //If parsing as a JSON fails, then the object is normally a string or possibly some horrible blob object
    //either way, the caller should work out what to do with it
    return obj;
  }
}

module.exports = Cache;

module.exports.MockCache = MockCache;