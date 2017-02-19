/* 
 * Mock Cache Handler for Node.js applications using Application Container Cloud Service
 * to allow for offline testing. Manages the cached objects in a local hashmap instead of
 * in the online cache.
 * This is designed to provide the same interfaces as the Cache object, but without worrying
 * about the caching infrastructure.
 * By: Callan Howell-Pavia (callan.howell-pavia@oracle.com)
 *
 * This implementation is designed to provide the a simple caching interface, in 
 * typical node style, using callbacks.
 *
 * Internal structure is slightly different, but should appear the same to clients
 * Internally, to handle TTL, objects have a 'value' and 'timeout' attribute.
 */

function MockCache(cacheName){
	//URI Encode the cacheName???
	this._cacheName = encodeURIComponent(cacheName);
  this._cache = {};
  this._count = 0;
}

MockCache.prototype.get = function(key, objType, callback){
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
  var obj = this._cache[key];
  if(!obj){
    //respond with a null object
    callback(null, null);
    return;
  }
  //Coerce the response into appropriate format
  try{
    var ret = _coerceObjectType(obj.value, objType);
  }catch(ex){
    callback(ex, null);
    return;
  }
  callback(null, ret);
};

//Add an entry to the cache
MockCache.prototype.put = function(key, val, ttl, isBlob, callback) {
  if(typeof ttl == 'function'){
    callback = ttl;
    ttl = null;
    isBlob = false;
  }
  if(typeof ttl == 'boolean'){
    if(typeof isBlob == 'function'){
      callback = isBlob;
    }
    isBlob = ttl;
    ttl = null;
  }
  if(typeof isBlob == 'function'){
    callback = isBlob;
    isBlob = false;
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
  if(!this._cache[key]){
    this._count++;
  }
  if(this._cache[key] && this._cache[key].timeout){
    clearTimeout(this._cache[key].timeout);
  }
  this._cache[key] = {};
  this._cache[key].value = val;
  //Handle ttl
  if(ttl && ttl > 0){
    var self = this;
    this._cache[key].timeout = setTimeout(function(){
        if(self._cache[key]){
          self._cache[key] = null; 
          self._count--;
        }
      }, ttl);
  }
  callback(null);
};

//Add an entry to the cache if the key is available, otherwise reject.
MockCache.prototype.putIfAbsent = function(key, val, ttl, isBlob, callback) {
  if(typeof ttl == 'function'){
    callback = ttl;
    ttl = null;
    isBlob = false;
  }
  if(typeof ttl == 'boolean'){
    if(typeof isBlob == 'function'){
      callback = isBlob;
    }
    isBlob = ttl;
    ttl = null;
  }
  if(typeof isBlob == 'function'){
    callback = isBlob;
    isBlob = false;
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
  if(this._cache[key]){
    callback(new Error('Did not insert entry, key already exists.'));
    return;
  }
  this._cache[key] = {};
  this._cache[key].value = val;
  this._count++;
  //Handle ttl
  if(ttl && ttl > 0){
    this._cache[key].timeout = setTimeout(function(){
        if(self._cache[key]){
          self._cache[key] = null; 
          self._count--;
        }
      }, ttl);
  }
  callback(null);
};

//Delete an entry from the cache
MockCache.prototype.delete = function(key, callback) {
  if(typeof key == 'number'){
    key = String(key);
  }
  if(typeof key != 'string'){
    throw new TypeError("Caching keys must be strings or numbers!");
  }
  if(this._cache[key] && this._cache[key].timeout){
    clearTimeout(this._cache[key].timeout);
  }
  if(this._cache[key]){
    this._count--;
  }
  this._cache[key] = null;
  callback(null);
};

//Clear the whole cache
MockCache.prototype.clear = function(callback) {
  this._cache = {};
  this._count = 0;
  callback();
};

/*Get the cache stats
 *Response object has the following fields:
 *'cache' - cache name
 *'count' - number of objects in the cache
 *'size' - size of the cache (in bytes?)
 */
MockCache.prototype.stats = function(callback){
  //Could calculate the size, but seems time intensive for no real gain
  //For now it is always count*4. Sorry folks.
  var cacheInfo = { cache: this._cacheName,
                    count: this._count,
                    size: this._count*4
                  };
  callback(null, cacheInfo);
};

/*
 * Internal method for coercing the response back into the expected format.
 * Takes an 'object hint' which defines the expected response format,
 * but if one is not provided, responds with the plain object. Should be fine,
 * since no serialization happens in the mock cache.
 */
function _coerceObjectType(obj, objHint){
    switch(objHint){
      case 'string':
      case 'blob':
        //Response that comes back is application/octet-stream, which we will return raw
        return obj;
      case 'number':
        var num = Number(obj);
        if(isNaN(num)){
          throw new TypeError("'number was requested as a type, but result is NaN!");
        }
        return num;
      case 'array':
        if(obj[0] == undefined){
          //Is an object, not an array, so we will construct an array of just this object
          return new Array(pObj);
        }
        return obj;
      case 'boolean':
        //Today's javascript fun-fact: 'false' is truthy!
        if(obj == 'false'){
          return false;
        }
        return Boolean(obj);
      default:
        return obj;
    }
}


module.exports = MockCache;