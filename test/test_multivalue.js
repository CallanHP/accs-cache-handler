var expect = require('chai').expect;

var mv = require("../util/multivalue");

describe("MultiValue Object", function(){
  describe("Encoding", function(){
    it("Test Encoding Strings", function(){
      var stringArr = new Array("stringOne", "stringTwo");
      var expectedOutcome = Buffer.from([0x00, 0x00, 0x00, 0x02, 
        0x00, 0x00, 0x00, 0x09, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x4f, 0x6e, 0x65,
        0x00, 0x00, 0x00, 0x09, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x54, 0x77, 0x6f]);
      expect(mv.encode(stringArr)).to.deep.equal(expectedOutcome);
    });

    it("Test Encoding Buffers", function(){
      var bufOne = Buffer.alloc(11, 'aGVsbG8gd29ybGQ=', 'base64');
      var bufTwo = Buffer.alloc(10, 'testString', 'utf8');
      var bufferArr = new Array(bufOne, bufTwo);
      var expectedOutcome = Buffer.from([0x00, 0x00, 0x00, 0x02, 
        0x00, 0x00, 0x00, 0x0b, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
        0x00, 0x00, 0x00, 0x0a, 0x74, 0x65, 0x73, 0x74, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67]);
      expect(mv.encode(bufferArr)).to.deep.equal(expectedOutcome);
    });

    it("Test Mixed Types", function(){
      var bufOne = Buffer.alloc(11, 'aGVsbG8gd29ybGQ=', 'base64');
      var strVal = "aString";
      var bufTwo = Buffer.alloc(10, 'testString', 'utf8');
      var mixedArr = new Array(bufOne, strVal, bufTwo);
      var expectedOutcome = Buffer.from([0x00, 0x00, 0x00, 0x03, 
        0x00, 0x00, 0x00, 0x0b, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
        0x00, 0x00, 0x00, 0x07, 0x61, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67,
        0x00, 0x00, 0x00, 0x0a, 0x74, 0x65, 0x73, 0x74, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67]);
      expect(mv.encode(mixedArr)).to.deep.equal(expectedOutcome);
    });

    it("Coerces a single object into an array of one entry", function(){
      var bufOne = Buffer.alloc(11, 'aGVsbG8gd29ybGQ=', 'base64');
      var expectedOutcome = Buffer.from([0x00, 0x00, 0x00, 0x01, 
        0x00, 0x00, 0x00, 0x0b, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]);
      expect(mv.encode(bufOne)).to.deep.equal(expectedOutcome);
    });

    it("Throws a TypeError for a non-string/Buffer object is passed to encode", function(){
      var complexObject = { name: "ObjectName",
                            value: 6,
                            truthy: true
                          };
      var objArr = new Array(complexObject);
      try{
        expect(mv.encode(objArr)).to.throw(TypeError);  
      }catch(err){}      
    });

    it("Throws a TypeError for a non-string encoding type", function(){
      var complexObject = { name: "ObjectName",
                            value: 6,
                            truthy: true
                          };
      var stringArr = new Array("stringOne", "stringTwo");
      try{
        expect(mv.encode(stringArr, complexObject)).to.throw(TypeError);  
      }catch(err){}      
    });
  });
  describe("Decoding", function(){
    it("Test Decoding Strings", function(){
      var inBuffer = Buffer.from([0x00, 0x00, 0x00, 0x02, 
        0x00, 0x00, 0x00, 0x09, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x4f, 0x6e, 0x65,
        0x00, 0x00, 0x00, 0x09, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x54, 0x77, 0x6f]);
      var stringArr = new Array("stringOne", "stringTwo");
      expect(mv.decode(inBuffer)).to.deep.equal(stringArr);
    });

    it("Test Decoding Buffers", function(){
      var bufOne = Buffer.alloc(11, 'aGVsbG8gd29ybGQ=', 'base64');
      var bufTwo = Buffer.alloc(10, 'testString', 'utf8');
      var bufferArr = new Array(bufOne, bufTwo);
      var inBuffer = Buffer.from([0x00, 0x00, 0x00, 0x02, 
        0x00, 0x00, 0x00, 0x0b, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
        0x00, 0x00, 0x00, 0x0a, 0x74, 0x65, 0x73, 0x74, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67]);
      expect(mv.decode(inBuffer, true)).to.deep.equal(bufferArr);
    });

    it("Throws an Error for malformed input Buffer", function(){
      var inBuffer = Buffer.from([0x00, 0x00, 0x00, 0x02, 
        0x00, 0x00, 0x00, 0xff, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
        0x00, 0x00, 0x00, 0x0a, 0x74, 0x65, 0x73, 0x74, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67]);
      try{
        expect(mv.decode(inBuffer, true)).to.throw(Error);   
      }catch(err){}
      
    });

    it("Throws a TypeError for a non-string/Buffer object is passed to decode", function(){
      var complexObject = { name: "ObjectName",
                            value: 6,
                            truthy: true
                          };
      var objArr = new Array(complexObject);
      try{
        expect(mv.decode(objArr)).to.throw(TypeError);  
      }catch(err){}      
    });

    it("Throws a TypeError for a non-string encoding type", function(){
      var complexObject = { name: "ObjectName",
                            value: 6,
                            truthy: true
                          };
      var stringArr = new Array("stringOne", "stringTwo");
      try{
        expect(mv.decode(stringArr, complexObject)).to.throw(TypeError);  
      }catch(err){}
    });
  });
});
