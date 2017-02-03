var expect = require('chai').expect
var Cache = require("../cache_handler")

var cacheName = "MOCHA_Test_Cache";
var testCache = new Cache(cacheName);
var testEntry = {};
testEntry.data = "This is some string data";
testEntry.boolean = true;
testEntry.number = 6;


describe("ACCS Cache Services", function(){
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
          done();
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
        }
        expect(res).to.equal("testVal1");
        done();
      });   
    });

    //Test Cache Read
    it("Get a non-existant object", function(done){
      testCache.get("MOCHAnotRealKey", function(err, res){
        if(err){
          done(err);
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
        }
        expect(res).to.be.a('number');
        expect(res).to.equal(15);
        done();
      })
    });

    it("Throw TypeErrors for non-string keys", function(){
      expect(testCache.get(true, function(err, res){})).to.throw(TypeError);
    });

  });
  
  //Test Cache insertion
  describe("Test inserting entries into the cache", function(){
    it("Insert a simple value", function(done){
      testCache.put("MOCHAtestInsertedVal1", "TestInsert", function(err){
        if(err){
          done(err);
        }
        testCache.get("MOCHAtestInsertedVal1", function(err, res){
          if(err){
            done(err);
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
      testCache.put("MOCHAtemporaryKey", "value", 500, function(err){
        if(err){
          done(err);
        }
        setTimeout(function(){
          testCache.get("MOCHAtemporaryKey", function(err, res){
            if(err){
              done(err);
            }
            expect(res).to.not.exist;
            done();
          });
        }, 1000);
      });
    });

    it("Coerces numeric keys into strings", function(done){
      testCache.put(155, "One-Hundred-and-Fifty-Five", function(err){
        if(err){
          done(err);
        }
        testCache.get(155, function(err, res){
          if(err){
            done(err);
          }
          expect(res).to.equal("One-Hundred-and-Fifty-Five");
          testCache.get("155", function(err, res){
            if(err){
              done(err);
            }
            expect(res).to.equal("One-Hundred-and-Fifty-Five");
            done();
          });
        });
      });
    });

    it("Throw TypeErrors for non-string/numeric keys", function(){
      expect(testCache.put(true, "value", function(err){})).to.throw(TypeError);
      var objKey = { "attr": "attr-val", "attr2": "attr2-val"};
      expect(testCache.putIfAbsent(objKey, "value", function(err){})).to.throw(TypeError);
    });
  });  
  
  describe("Test Deleting entries from the cache", function(){
    //Test deleting a value
    it("Delete a value", function(done){
      testCache.put("MOCHAvalueToDelete", "value", function(err){
        if(err){
          done(err);
        }
        testCache.delete("MOCHAvalueToDelete", function(err){
          if(err){
            done(err);
          }
          testCache.get("MOCHAvalueToDelete", function(err, res){
            if(err){
              done(err);
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
        }
        cacheToClear.clear(function(err){
          if(err){
            done(err);
          }
          cacheToClear.stats(function(err, res){
            if(err){
              done(err);
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
        }
        testCache.delete(156, function(err){
          if(err){
            done(err);
          }
          testCache.get("156", function(err, res){
            if(err){
              done(err);
            }
            expect(res).to.not.exist;
            done();
          });
        });
      });
    });

    it("Throw TypeErrors for non-string/numeric keys", function(){
      expect(testCache.delete(true, function(err){})).to.throw(TypeError);
    });
  });
  
  describe("Misc", function(){
    //Call 'get cache metrics' on our testing cache. 
    //The cache contents is not really checked, just that valid results come back.
    it("Get cache metrics", function(done){
      testCache.stats(function(err, res){
        if(err){
          done(err);
        }
        expect(res).to.include.keys('cache');
        expect(res.cache).to.equal(cacheName);
        expect(res).to.include.keys('count');
        expect(res.count).to.be.at.least(1);
        expect(res).to.include.keys('size');
        expect(res.size).to.be.at.least(1);
      });
    });
  }); 

  //Clear our testingData
  after(function(){
    testCache.clearCache(function(err){
      if(err){
        testCache.delete("MOCHAtestKey1", function(err){});
        testCache.delete("MOCHAtestInsertedVal1", function(err){});
        testCache.delete("MOCHAduplicatedKey", function(err){});
        testCache.delete("MOCHAtemporaryKey", function(err){});
        testCache.delete("MOCHAvalueToDelete", function(err){});
        testCache.delete(155, function(err){});
      }
    });    
  });

});