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
  //TODO: Encoding lookup for bytes per char?
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

//Hmm... We don't know if the caller is expecting strings or buffers back...
//Lets leave this unexported for now, until I know more about where it is required
// module.exports.decode = function(components){

// }

