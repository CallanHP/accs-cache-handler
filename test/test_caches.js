var expect = require('chai').expect;
var nock = require('nock');

//Set up offline testing if required
var shouldMock = true;
var mockServices;
if(process.env.TEST_WITH_REAL_CACHE_ENDPOINTS && process.env.TEST_WITH_REAL_CACHE_ENDPOINTS == 'true'){
  shouldMock = false;
}
if(shouldMock){
  process.env.CACHING_INTERNAL_CACHE_URL = "mock_offline_testing_hostname";
  //Load nock object json
  mockServices = nock.load("./test/mocks_17_1_1.json");
}else{

}

/*
//Uncomment to record the calls
process.env.CACHING_INTERNAL_CACHE_URL = "internal_instance";
nock.recorder.rec({
  dont_print: true,
  output_objects: true
});
*/

var Cache = require("../cache_handler");

var cacheName = "MOCHA_Test_Cache";
var testCache = new Cache(cacheName);
var testEntry = {};
testEntry.data = "This is some string data";
testEntry.boolean = true;
testEntry.number = 6;


describe("ACCS Cache Services Base Functionality - 17.1.1 Release", function(){
  //Insert some dummy data
  before(function(done){
    testCache.put("MOCHAtestKey1", "testVal1", function(err){
      if(err){
        console.log(err);
        done(err);
      }
      testCache.put("MOCHAtestKey2", testEntry, function(err){
        if(err){
          console.log(err);
        }
        testCache.put("MOCHANumericKey", 15, function(err){
          if(err){
            console.log(err);
          }
          testCache.put("MOCHAArrayKey", new Array(1,2,3,4,5), function(err){
            if(err){
              console.log(err);
            }
            done();
          });
        });
      });
    });
  });
  //Test reads
  describe("Test getting entries from the cache", function(){
    //Test Cache Read
    it("Get a string", function(done){
      testCache.get("MOCHAtestKey1", function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.equal("testVal1");
        expect(res).to.be.a('string');
        done();
      });   
    });

    //Test Cache Read
    it("Get a non-existant object", function(done){
      testCache.get("MOCHAnotRealKey", function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.not.exist;
        done();
      });   
    });

    //Test Cache Read JSON
    it("Get a JSON object", function(done){
      testCache.get("MOCHAtestKey2", function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.deep.equal(testEntry);
        done();
      });
    });

    //Test object type coercion
    it("Gets an number using an object type hint", function(done){
      testCache.get("MOCHANumericKey", 'number', function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.be.a('number');
        expect(res).to.equal(15);
        done();
      })
    });
    //Test object type coercion
    it("Fails when the object type hint for number cannot obtain a number", function(done){
      testCache.get("MOCHAtestKey1", 'number', function(err, res){
        expect(err).to.exist;
        expect(err.message).to.contain('NaN');
        done();
      })
    });
    //Test object type coercion
    it("Gets an array using an object type hint", function(done){
      testCache.get("MOCHAArrayKey", 'array', function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.be.instanceof(Array);
        expect(res).to.deep.equal(new Array(1,2,3,4,5));
        done();
      })
    });

    it("Throw TypeErrors for non-string keys", function(done){
      try{
        expect(testCache.get(true, function(err, res){
          done("Should have thrown a TypeError!");
        })).to.throw(TypeError);  
      }catch(e){
        done();
      }      
    });

  });
  
  //Test Cache insertion
  describe("Test inserting entries into the cache", function(){
    it("Insert a simple value", function(done){
      testCache.put("MOCHAtestInsertedVal1", "TestInsert", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.get("MOCHAtestInsertedVal1", function(err, res){
          if(err){
            done(err);
            return;
          }
          expect(res).to.equal("TestInsert");
          done();
        });
      });
      
    });

    //Test Cache 'put if absent'
    it("Insert a duplicate key, with 'putIfAbsent'", function(done){
      testCache.put("MOCHAduplicatedKey", "value", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.putIfAbsent("MOCHAduplicatedKey", "value2", function(err){
          expect(err).to.exist;
          expect(err.message).to.contain('key already exists');
          done();
        });
      });
      
    });

    //Test Cache put with time to live
    it("Insert a value with TTL", function(done){
      this.timeout(5000);
      testCache.put("MOCHAtemporaryKey", "value", 500, function(err){
        if(err){
          done(err);
          return;
        }
        setTimeout(function(){
          testCache.get("MOCHAtemporaryKey", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.not.exist;
            done();
          });
        }, 2000);
      });
    });

    it("Coerces numeric keys into strings", function(done){
      testCache.put(155, "One-Hundred-and-Fifty-Five", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.get(155, function(err, res){
          if(err){
            done(err);
            return;
          }
          expect(res).to.equal("One-Hundred-and-Fifty-Five");
          testCache.get("155", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.equal("One-Hundred-and-Fifty-Five");
            done();
          });
        });
      });
    });

    it("Throw TypeErrors for non-string/numeric keys", function(done){
      try{
        expect(testCache.put(true, "value", function(err){
          done("Should have thrown a TypeError!");
        })).to.throw(TypeError);
      }catch(e){
        var objKey = { "attr": "attr-val", "attr2": "attr2-val"};
        try{
          expect(testCache.putIfAbsent(objKey, "value", function(err){
            done("Should have thrown a TypeError!");
          })).to.throw(TypeError);
        }catch(e){
          done()
        }
      }      
    });
    it("Throw TypeErrors for invalid ttl values", function(done){
      try{
        expect(testCache.put("MOCHAinvalidTTLKey", "value", "ttlString", function(err){
          done("Should have thrown a TypeError!");
        })).to.throw(TypeError);
      }catch(e){
        try{
          expect(testCache.putIfAbsent("MOCHAinvalidTTLKey", "value", "ttlString", function(err){
            done("Should have thrown a TypeError!");
          })).to.throw(TypeError);
        }catch(e){
          done();
        }
      }      
    });
  });

  //Test Cache Replace Operation
  describe("Test replacing entries in the cache", function(){
    it("Replace a simple value", function(done){
      testCache.put("MOCHAtestReplaceValue", "TestInsertBefore", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.replace("MOCHAtestReplaceValue", "TestInsertAfter", "TestInsertBefore", function(err){
          if(err){
            done(err);
            return;
          }
          testCache.get("MOCHAtestReplaceValue", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.equal("TestInsertAfter");
            done();
          });
        });
      });
    });

    it("Replace a complex value", function(done){
      var oldValue = { name: "TestInsertName",
                       parameter: true
                     };
      testCache.put("MOCHAtestReplaceValueComplex", oldValue, function(err){
        if(err){
          done(err);
          return;
        }
        var newValue = { name: "TestInsertName",
                         parameter: false
                       };
        testCache.replace("MOCHAtestReplaceValueComplex", newValue, oldValue, function(err){
          if(err){
            done(err);
            return;
          }
          testCache.get("MOCHAtestReplaceValueComplex", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.deep.equal(newValue);
            done();
          });
        });
      });
    });

    it("Attempt to replace a simple value with wrong old value", function(done){
      testCache.put("MOCHAtestReplaceValue", "TestInsertBefore", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.replace("MOCHAtestReplaceValue", "TestInsertAfter", "TestInsertEvenOlder", function(err){
          expect(err).to.exist;
          expect(err.message).to.contain('cached value does not equal oldVal');
          testCache.get("MOCHAtestReplaceValue", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.equal("TestInsertBefore");
            done();
          });
        });
      });
    });

    it("Attempt to replace a complex value with wrong old value", function(done){
      var oldValue = { name: "TestInsertName",
                       parameter: true
                     };
      testCache.put("MOCHAtestReplaceValueComplex", oldValue, function(err){
        if(err){
          done(err);
          return;
        }
        var newValue = { name: "TestInsertName",
                         parameter: false
                       };
        testCache.replace("MOCHAtestReplaceValueComplex", newValue, {name: "Wrong entry!"}, function(err){
          expect(err).to.exist;
          expect(err.message).to.contain('cached value does not equal oldVal');
          testCache.get("MOCHAtestReplaceValueComplex", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.deep.equal(oldValue);
            done();
          });
        });
      });
    });

    it("Throw TypeErrors for non-string/numeric keys", function(done){
      try{
        expect(testCache.replace(true, "value", "old", function(err){
          done("Should have thrown a TypeError!");
        })).to.throw(TypeError);
      }catch(e){
        var objKey = { "attr": "attr-val", "attr2": "attr2-val"};
        try{
          expect(testCache.replace(objKey, "value", "old", function(err){
            done("Should have thrown a TypeError!");
          })).to.throw(TypeError);
        }catch(e){
          done()
        }
      }      
    });

    it("Throw SyntaxErrors for missing parameters", function(done){
      try{
        expect(testCache.replace("value", "oldVal", function(err){
          done("Should have thrown a TypeError!");
        })).to.throw(TypeError);
      }catch(e){
        try{
          expect(testCache.replace(function(err){
            done("Should have thrown a TypeError!");
          })).to.throw(TypeError);
        }catch(e){
          done()
        }
      }      
    });

    it("Throw TypeErrors for invalid ttl values", function(done){
      try{
        expect(testCache.replace("MOCHAinvalidTTLKey", "value", "oldValue", "ttlString", function(err){
          done("Should have thrown a TypeError!");
        })).to.throw(TypeError);
      }catch(e){
        done();
      }      
    });
  });
  
  describe("Test Deleting entries from the cache", function(){
    //Test deleting a value
    it("Delete a value", function(done){
      testCache.put("MOCHAvalueToDelete", "value", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.delete("MOCHAvalueToDelete", function(err){
          if(err){
            done(err);
            return;
          }
          testCache.get("MOCHAvalueToDelete", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.not.exist;
            done();
          });
        });
      });
    });

    //Create a new cache, then clear it.
    it("Clear an entire cache", function(done){
      var cacheToClear = new Cache("MOCHA_Cache_To_Clear");
      cacheToClear.put("TestKey1", "TestVal", function(err){
        if(err){
          done(err);
          return;
        }
        cacheToClear.clear(function(err){
          if(err){
            done(err);
            return;
          }
          cacheToClear.stats(function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res.count).to.equal(0);
            cacheToClear = null;
            done();
          });
        });
      });
    });

    it("Coerces numeric keys into strings", function(done){
      testCache.put("156", "One-Hundred-and-Fifty-Six", function(err){
        if(err){
          done(err);
          return;
        }
        testCache.delete(156, function(err){
          if(err){
            done(err);
            return;
          }
          testCache.get("156", function(err, res){
            if(err){
              done(err);
              return;
            }
            expect(res).to.not.exist;
            done();
          });
        });
      });
    });

    it("Throw TypeErrors for non-string/numeric keys", function(){
      try{
        expect(testCache.delete(true, function(err){})).to.throw(TypeError);
      }catch(e){}
    });
  });

  describe("Test Buffer behaviour", function(){
    //Test behaviour with binary streams
    it("Do buffer stuffs with the cache", function(done){
      var blobbyBuffer = Buffer.alloc(512, true, 'binary');
      var longInt8View = new Uint8Array(blobbyBuffer);
      for (var i=0; i< longInt8View.length; i++) {
        longInt8View[i] = i % 128;
      }
      
      testCache.put("MOCHABlobKey", Buffer.from(longInt8View), true, function(err, res){
        if(err){
          done(err);
          return;
        }
        testCache.get("MOCHABlobKey", 'buffer', function(err, res){
          if(err){
            done(err);
            return;
          }
          expect(res).to.be.ok;
          expect(res).to.have.lengthOf(512);
          var resBytes = new Uint8Array(res);
          expect(resBytes).to.deep.equal(longInt8View);
          done();
        });      
      });
    });
  }); 
  
  describe("Misc", function(){
    //Call 'get cache metrics' on our testing cache. 
    //The cache contents is not really checked, just that valid results come back.
    it("Get cache metrics", function(done){
      testCache.stats(function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.include.keys('cache');
        expect(res.cache).to.equal(cacheName);
        expect(res).to.include.keys('count');
        expect(res.count).to.be.at.least(1);
        expect(res).to.include.keys('size');
        expect(res.size).to.be.at.least(1);
        done();
      });
    });
    it("Get cache metrics is correctly empty for non-existant caches", function(done){
      var testMetricsCache = new Cache("MOCHA_Cache_For_Metrics");
      testMetricsCache.stats(function(err, res){
        if(err){
          done(err);
          return;
        }
        expect(res).to.include.keys('cache');
        expect(res.cache).to.equal("MOCHA_Cache_For_Metrics");
        expect(res).to.include.keys('count');
        expect(res.count).to.equal(0);
        expect(res).to.include.keys('size');
        expect(res.size).to.equal(0);
        done();
      });
    });
  }); 

  //Clear our testingData
  after(function(){
    /*
    //Uncomment to create nock objects!
    var nockCalls = nock.recorder.play();
    require('fs').writeFileSync("./test/mocks.json", JSON.stringify(nockCalls, null, 2));
    console.log("Wrote mocks.json!");
    */
    
    testCache.clear(function(err){
      if(err){
        testCache.delete("MOCHAtestKey1", function(err){});
        testCache.delete("MOCHAtestInsertedVal1", function(err){});
        testCache.delete("MOCHAduplicatedKey", function(err){});
        testCache.delete("MOCHAtemporaryKey", function(err){});
        testCache.delete("MOCHAvalueToDelete", function(err){});
        testCache.delete("MOCHABlobKey", function(err){});
        testCache.delete(155, function(err){});
        return;
      }
    });    
  });

});