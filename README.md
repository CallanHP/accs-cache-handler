# accs-cache-handler

Library to provide standard, simple caching interfaces (get, put, delete) around the Caching platform services in Oracle's Application Container Cloud service.

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

## Full Documentation

While 'put', 'get', and 'delete' will take you far, sometimes you just need more capability.

### Constructor
```
Cache(cacheName)
```
Creates a new handler for interacting with an ACCS caching instance.

Notably, this doesn't create or join a cache, as cache creation in ACCS is dynamic, meaning caches are created on first insertion, using the supplied cache name. 

**cacheName:** subsequent insertions and retrievals will interact with the cache specified by this cache name.

### Cache.put
```
put(key, val, [ttl], [isBlob], callback)
```
put inserts an entry into the cache. This will overwrite any existing entry with the same key. Use putIfAbsent if this is not the desired behaviour.

**key:** the key used to reference the inserted value in future calls, must be a string or number (which is cast to a string, so a put on 422 will overwrite a previous put with a key of "422").

**val:** the object to be inserted. This object can be a primitive or a more complex javascript object. This is restricted to objects that can be serialised via JSON.stringify(), so complex objects and arrays are fine, though functions, or objects containing functions will not work. It is possible to store those functions as a string, then eval them, which is about as recommended as using eval() ever is.

**ttl:** (optional) time-to-live for the cache entry, in ms.

**isBlob:** (optional) boolean that describes whether to skip parsing the input, and instead treat it as raw data

**callback:** the callback function for put() takes the form of callback(err)

### Cache.putIfAbsent
```
putIfAbsent(key, val, [ttl], [isBlob], callback)
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

#### About Object Types
Objects in the cache are stored serialised, and are stored without any type information for deserialisation. As such, when performing a get, a best-guess approach is used to determine the object type to return.

In many scenarios, the default behaviour will likely be fine, as implicit type conversion in Javascript lets you get away with a lot, but objType can be used as a hint for how to deserialize the object if specific behaviour is required. If set, get will attempt to coerce the result into the specified format. In addition to the standard javascript object types (excluding 'function' which is not supported), objType also accepts 'array'.

If calling functions wish to parse the response themselves, it is advised to use 'string' as the objType hint, then parse the returned string as required.

If you want to use typed arrays, or node.js Buffers, then you can use the 'blob' object hint, and set isBlob to true on your put. This results in the handler doing no parsing, simply putting and getting whatever has been passed to it. As this has no validation, it may throw unexpected errors, and has not been heavily tested.

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

