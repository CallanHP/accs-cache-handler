var request = require('request');

process.env.HTTP_PROXY = "";
process.env.HTTPS_PROXY = "";

var options = {
				uri:'http://www.google.com'
			  };

request(options, function(err, res, data){
	if(err){
		console.log(JSON.stringify(err));
	}
	console.log("res: " +res);
	console.log("data: " +data);
})