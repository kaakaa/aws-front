var _ = require('lodash-node'),
    _s = require('underscore.string'),
    ex = require('express'),
AWS = require('aws-sdk');

var app = ex();
AWS.config.update({
	"accessKeyId": _s.trim(process.env.AWS_ACCESS_KEY_ID),
	"secretAccessKey": _s.trim(process.env.AWS_SECRET_ACCESS_KEY),
	"region": _s.trim(process.env.AWS_REGION)
});

app.get('/', function(req, res){
	var ec2 = new AWS.EC2();
	var list = [];
	ec2.describeInstances({}, function (err, data) {
		if(err){
			console.log(err, err.stack);
			res.send("AWS connection error => " + err);
		}
		if(data.Reservations.length == 0){
			console.log("No Result - " + data);
			return;
		}	
		
		list = _.map(data.Reservations[0].Instances, function(instance, index, object){
			var ip = instance.PublicIpAddress;
			if(ip.length > 0){
				return ip
			}
		});

		if(list.length > 0){
			var url = "http://" + list[0];
			console.log("redirect => " + url);
	  	res.redirect(url);
		} else {
			res.send("Not Found Instance");
		}
	});
});

app.listen(process.env.PORT || 3000);



