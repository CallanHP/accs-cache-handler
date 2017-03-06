/*
 * MultiValue util, for handling the x-multivalue-octet-stream data type required
 * for a few of the ACCS caching behaviours.
 * Based upon sample code provided by Rick Grehan (rick.grehan@oracle.com)
 *
 * The MultiValue stream required has the following form:
 *
 * /--4 bytes--\  /---4 bytes--\ /n bytes...\
 * [num_elements][element_length][element....]{rest of elements in the same form}
 * 
 * The 4-byte blocks are simply the byte components of a 32-bit integer (possibly unsigned?)
 *
 * For speed and simplicity, this implementation uses Node Buffers to provide the octet-stream
 */

const MULTI_VALUE_COMPONENT_TYPE = "MultiValue expects an array of Strings or Buffers. Ensure data is serialized before being added to the MultiValue.";
const MULTI_VALUE_DECODE_TYPE = "MultiValue expects a to decode a Buffer or a string.";
const MALFORMED_DECODE = "Malformed value passed to decode, could not be parsed.";
const ENCODING_TYPE = "encoding must be a string or falsey.";


module.exports.encode = function(components, encoding){
  if(!Array.isArray(components)){
    //Coerce to array
    components =  new Array(components);
  }
  for(var component in components){
    if(typeof components[component] != 'string' && !Buffer.isBuffer(components[component])){
      throw new TypeError(MULTI_VALUE_COMPONENT_TYPE);
    }
  }
  if(!encoding){
    encoding = 'utf8';
  }
  if(typeof encoding != 'string'){
    throw new TypeError(ENCODING_TYPE);
  }
  //TODO: Encoding lookup for bytes per char for non utf8 strings
  //At present, cannot handle non-utf8 strings. Sorry cachers of Asian languages.
  //Calculate total length of the Buffer
  var bufferLen = 4;
  for(var component in components){
    bufferLen += 4;
    if(typeof components[component] == 'string'){
      //Strings in javascript are 2 bytes per character
      //ENCODING DEPENDANT!
      bufferLen += components[component].length;
    }else{
      //Working with a buffer, so length is size in bytes
      bufferLen += components[component].length;  
    }
    
  }
  var buf = Buffer.allocUnsafe(bufferLen);
  //Assuming caching service is Big Endian?
  //Pass true as the third parameter for speed (should be safe...)
  var bufOffset = buf.writeUInt32BE(components.length, 0, true);
  for(var component in components){
    if(typeof components[component] == 'string'){
      bufOffset = buf.writeUInt32BE(components[component].length, bufOffset, true);
      bufOffset += buf.write(components[component], bufOffset, components[component].length, encoding);
    }else{
      bufOffset = buf.writeUInt32BE(components[component].length, bufOffset, true);
      bufOffset += components[component].copy(buf, bufOffset, 0);
    }
  }
  return buf;
}

//Given how the accs-cache-handler is written, Strings are the default, so we will return those unless 'isBlob' is set
module.exports.decode = function(buf, encoding, isBlob){
  if(typeof encoding == 'boolean'){
    isBlob = encoding;
    encoding = 'utf8';
  }
  if(!encoding){
    encoding = 'utf8';
  }
  if(typeof encoding != 'string'){
    throw new TypeError(ENCODING_TYPE);
  }
  if(!Buffer.isBuffer(buf) && typeof buf != 'string'){
    throw new TypeError(MULTI_VALUE_DECODE_TYPE);
  }
  //Convert a string to a buffer
  if(typeof buf == 'string'){
    buf = Buffer.from(buf, encoding);
  }
  var bufOffset = 4;
  var ret = []
  //Read the number of entries
  var numEntries = buf.readUInt32BE(0);
  for(var i = 0; i<numEntries; i++){
    try{
      //read length of entry
      var len = buf.readUInt32BE(bufOffset);
      bufOffset += 4;
      if(isBlob){
        var newBuf = Buffer.allocUnsafe(len);
        if(len != buf.copy(newBuf, 0, bufOffset)){
          throw new Error("Assertion failed!");
        }
        ret.push(newBuf);
      }else{
        ret.push(buf.toString(encoding, bufOffset, bufOffset + len));
      }
      bufOffset += len;
    }catch(err){
      throw new Error(MALFORMED_DECODE);
    }
  }
  return ret;
}

