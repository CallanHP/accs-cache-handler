# accs-cache-handler

Library to provide standard, simple caching interfaces (get, put, delete) around the Caching platform services in Oracle's Application Container Cloud service.

## Table of Contents

+ [Installation](#installation)
+ [Simple Usage](#simple-usage)
+ [ACCS Requirements](#accs-requirements)
+ [Offline Testing](#offline-testing) - i.e. Testing code not deployed to ACCS
+ [Simple Usage](#simple-usage)
+ [Full Documentation](#full-documentation)
	* [Constructor](#constructor)
 	* [Cache.put()](#cacheput)
 	* [Cache.putIfAbsent()](#cacheputifabsent)
 	* [Cache.get()](#cacheget)
 	* [Cache.delete()](#cachedelete)
 	* [Cache.replace()](#cachereplace)
 	* [Cache.clear()](#cacheclear)
  	* [Cache.stats()](#cachestats)
+ [About Object Types](#about-object-types)
+ [Changelog](#changelog)

## Installation

```bash
$ npm install accs-cache-handler
```

## Simple Usage
This caching handler is designed to provide a simplified interface for interacting with ACCS caches. It is designed around the standard Node.js callback model, and offers simple 'put', 'get' and 'delete' methods for interacting with objects in the cache. The complete API is available below, but these three methods will cover the majority of use cases.
Sample usage is as follows:

```js
var Cache = require('accs-cache-handler');

var cacheName = "BrandNewAppCache";
var objCache = new Cache(cacheName);

//Store an object
objCache.put("CachingKey", "CachingValue", function(err){
	if(err){
		console.log(err);
	}
	//Retrieve the object
	objCache.get("CachingKey", function(err, result){
		if(err){
			console.log(err);
		}
		console.log(result); //"CachingValue"
		//Delete the object
		objCache.delete("CachingKey", function(err){
			if(err){
				console.log(err);
			}
		});
	});
});
```

## ACCS Requirements
In order to use caching in ACCS, you need to have initialised a Caching Cluster and added a binding to your application. This process is documented [here](http://docs.oracle.com/en/cloud/paas/app-container-cloud/cache/typical-workflow-creating-and-using-caches.html).

## Offline Testing

Since the ACCS Caching APIs are only available from within the ACCS Container, it can become somewhat annoying to develop applications which rely upon caching behaviour, as you cannot test your code locally without stubbing all of the caching services. Rather than have everyone who utilises this library write their own stubs, a MockCache interface is bundled for local testing which provides all of the same interfaces, and simply stores cached objects locally (to the node instance, not the instance of the MockCache object).

This interface is loaded automatically if the CACHING_INTERNAL_CACHE_URL environment variable isn't set. This will occur in ACCS if your Service bindings are absent or incorrect, and should occur all of the time if you are testing code locally. This means there should be no change required to take locally tested code and deploy it to an ACCS instance for SIT testing.

For more information on the CACHING_INTERNAL_CACHE_URL environment variable, check the documentation [here](http://docs.oracle.com/en/cloud/paas/app-container-cloud/cache/cache-url-environment-variable.html).

If for some reason you need to create a mock cache explicitly, you can do so via the .MockCache export.
```js
var Cache = require('accs-cache-handler');
var MockCache = Cache.MockCache;
var explicitMockCache = new MockCache('Explicit-Mock-Cache');
```

There is a minor difference between the interfaces in that the size attribute returned from Cache.stats is not calculated accurately, it instead simply returns the number of entries time four. Calculating a semi-accurate memory footprint in Javascript for a flexibly sized object is pretty compute intense, and seems unneeded for most scenarios. The online value is still accurate, as it comes from the ACCS Cache instance itself.

## Full Documentation

While 'put', 'get', and 'delete' will take you far, sometimes you just need more fine-grained controls. This library is designed to cover the full API capability, including TTL, precise put behaviours, etc.

### Constructor
```
Cache(cacheName)
```
Creates a new handler for interacting with an ACCS caching instance.

Notably, this doesn't create or join a cache, as cache creation in ACCS is dynamic, meaning caches are created on first insertion, using the supplied cache name. 

**cacheName:** subsequent insertions and retrievals will interact with the cache specified by this cache name.

### Cache.put
```
put(key, val, [ttl], [isBuffer], callback)
```
put inserts an entry into the cache. This will overwrite any existing entry with the same key. Use putIfAbsent if this is not the desired behaviour.

**key:** the key used to reference the inserted value in future calls, must be a string or number (which is cast to a string, so a put on 422 will overwrite a previous put with a key of "422").

**val:** the object to be inserted. This object can be a primitive or a more complex javascript object. This is restricted to objects that can be serialised via JSON.stringify(), so complex objects and arrays are fine, though functions, or objects containing functions will not work. It is possible to store those functions as a string, then eval them, which is about as recommended as using eval() ever is.

**ttl:** (optional) time-to-live for the cache entry, in ms. An absent or negative value inserts the value with no ttl (indefinite).

**isBuffer:** (optional) boolean that describes whether to skip parsing the input, and instead treat it as raw data. *Deprecated: isBuffer is no longer required, as the object type is detected dynamically*

**callback:** the callback function for put() takes the form of callback(err)

### Cache.putIfAbsent
```
putIfAbsent(key, val, [ttl], [isBuffer], callback)
```
Cache.putIfAbsent behaves as Cache.put, though does not overwrite existing values, instead returning an error via the callback function if the key is already in use.

### Cache.get
```
get(key, [objType], callback)
```
get retrieves an entry from the cache, or returns null if there is no entry associated with that key.

**key:** the key used to insert the value originally, must be a string or number (which is cast to a string anyway, so a key of 422 is equivalent to "422")

**objType:** (optional) a type hint for how the response should be returned in the callback. See 'About Object Types' below for more detail.

**callback:** the callback function for get() takes the form of callback(err, response), where response is the object which was retrieved from the cache. 'typeof response' varies, see 'About Object Types'

### Cache.delete
```
get(key, callback)
```
delete removes an entry from the cache. This is idempotent, and no error is thrown if the cache key is not present, making it safe to call on values with ttl, or from multiple instances.

**key:** the key used to insert the value originally

**callback:** the callback function for delete() takes the form of callback(err). 


### Cache.replace
```
replace(key, val, oldVal, [ttl], callback)
```
replace performs a conditional insert into the cache, inserting val associated with the key only if the current entry is equal to the supplied oldVal. Returns an error to the callback function if the cached value does not equal the supploed value. 

**key:** the key used to reference the inserted value in future calls, must be a string or number (which is cast to a string, so a put on 422 will overwrite a previous put with a key of "422").

**val:** the object to be inserted. See put for details.

**oldVal:** the object against which the currently cached entry is checked for equality.

**ttl:** (optional) time-to-live for the cache entry, in ms. An absent or negative value inserts the value with no ttl (indefinite).

**callback:** the callback function for put() takes the form of callback(err)

### Cache.clear
```
clear(callback)
```
clear deletes all entries from the cache, including those set by other applications or application instances.

**callback:** the callback function for clear() takes the form of callback(err)

### Cache.stats
```
stats(callback)
```
stats retrieves information about the cache, including the total size and number of entries

**callback:** the callback function for stats() takes the form of callback(err, response). response has the following format:
```js
{
	"cache": "BrandNewAppCache" //Name of the cache
	"count": 424 //Number of items in the cache
	"size": 20345 //Memory footprint of the cache (in bytes)
}
```

## About Object Types
Objects in the cache are stored serialised, and are stored without any type information for deserialisation. As such, when performing a get, a best-guess approach is used to determine the object type to return.

In many scenarios, the default behaviour will likely be fine, as implicit type conversion in Javascript lets you get away with a lot, but objType can be used as a hint for how to deserialize the object if specific behaviour is required. If set, get will attempt to coerce the result into the specified format. In addition to the standard javascript object types (excluding 'function' which is not supported), objType also accepts 'array', which will attempt to coerce the response into an Array if possible (using the array constructor), and 'buffer', which will return a node.js Buffer object.

If calling functions wish to parse the response themselves, it is advised to use 'string' as the objType hint, then parse the returned string as required.

If you want to use node.js Buffers, then you can use the 'buffer' object hint, and set isBuffer to true on your put. This results in the handler doing no parsing, simply putting and getting whatever has been passed to it. As this has no validation, it may throw unexpected errors, and has not been heavily tested. By default, the Buffer object which is returned is written with the 'utf8' encoding, which should be fine for binary streams.

## Changelog

Patch versions are used for bug and documentation-fixes.

**1.0.x:** Initial release. 

**1.1.x:** Added offline-testing mode for testing code not deployed to ACCS.

**1.2.x:** Added 17.1.5 functionality, improved handling of Buffers.

**1.3.x:** Added connection-retry and backoff, to accomodate connectivity hiccups during cache scaling, as described [here](http://docs.oracle.com/en/cloud/paas/app-container-cloud/cache/handling-connection-exceptions-retries.html).