/* 
 * Cache Handler for Node.js applications using Application Container Cloud Service
 * By: Callan Howell-Pavia (callan.howell-pavia@oracle.com)
 *
 * This implementation is designed to provide the a simple caching interface, in 
 * typical node style, using callbacks.
 * Internally the cache uses byte arrays (octet streams), so focus is upon coercing
 * the cached objects into appropriate formats.
 */
var request = require('request');

//Retrieve the cache url set by ACCS
var CCSHOST = process.env.CACHING_INTERNAL_CACHE_URL;

function Cache(cacheName){
	//URI Encode the cacheName???
	this._cacheName = encodeURIComponent(cacheName);
	this._cacheURL = "http://" +CCSHOST +":8080/ccs/" +this._cacheName;
}

Cache.prototype.get = function(key, objType, callback){
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
	var options = { url: this._cacheURL +"/" +encodeURIComponent(key) };
	request(options, function(err, response, body){
		if(err){
			callback(err);
			return;
		}
		if(response.status == 404){
			//respond with a null object
			callback(null, null);
		}else{
			//TODO: Coerce the response into appropriate format
			callback(null, body);
		}
		
	});
	
}

Cache.prototype.put = function(key, val, ttl, callback) {
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
	if(ttl && (typeof ttl != 'number' || ttl <= 0){
		throw new TypeError("Time to live for cache entries must a positive number!");
	}
	callback(null);
};

//Add an entry to the cache if the key is available, otherwise reject.
Cache.prototype.putIfAbsent = function(key, val, ttl, callback) {
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
	if(ttl && (typeof ttl != 'number' || ttl <= 0){
		throw new TypeError("Time to live for cache entries must a positive number!");
	}
	callback(null);
};

Cache.prototype.delete = function(key, callback) {
	callback(null);
};

Cache.prototype.clear = function(callback) {
	callback(null);
};

Cache.prototype.stats = function(callback){
	callback(null);
};



module.exports = Cache;