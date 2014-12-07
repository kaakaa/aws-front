var _	= require('lodash-node'),
	moment_jp = require('moment')().zone("+09:00"),
  _s	= require('underscore.string'),
  ex	= require('express'),
  AWS	= require('aws-sdk');

var app = ex();

// set AWS configuration
AWS.config.update({
	"accessKeyId": _s.trim(process.env.AWS_ACCESS_KEY_ID),
	"secretAccessKey": _s.trim(process.env.AWS_SECRET_ACCESS_KEY),
	"region": _s.trim(process.env.AWS_REGION)
});

var getParams = function(tag_string){
	var running_filter = {Name: "instance-state-name", Values: ["running"]};
	if(!tag_string || tag_string.length <= 0){ return {Filters: [running_filter]} }

	var filters = _.chain(tag_string.split(','))
		.map(function(e){ return e.split('=')})
		.filter(function(e){ return e.length == 2 })
		.map(function(e){
			var obj = new Object();
			obj.Name = "tag:" + _s.trim(e[0]);
			obj.Values = [_s.trim(e[1])];
			return obj;
		})
		.value()
	filters.push(running_filter);
	console.log(filters);
	return {Filters: filters};
}

app.get('/', function(req, res){
	var ec2 = new AWS.EC2();
	var params = getParams(_s.trim(process.env.AWS_FRONT_TAGS));
	ec2.describeInstances(params, function (err, data) {
		if(err){
			console.log(err, err.stack);
			res.send("AWS connection error => " + err);
		}

		var iplist = _.chain(data.Reservations)
			.map(function(e){ return e.Instances; })
			.flatten()
			.map(function(e){ return e.PublicIpAddress; })
			.value();

		if(iplist.length > 0){
			var url = "http://" + iplist[0];
			console.log("redirect => " + url);
			res.redirect(url);
		} else {
			res.send("Not Found Instance");
		}
	});
});

app.post('/run_scheduler', function(req, res){
	var ec2 = new AWS.EC2();
	var params = getParams(_s.trim(process.env.AWS_FRONT_TAGS));
	var instances = ec2.describeInstances(params, function (err, data) {
		if(err){
			console.log(err, err.stack);
			res.send("AWS connection error => " + err);
		}

	  var nowHour = moment_jp.hour();
		var instances = _.chain(data.Reservations)
			.map(function(e){ return e.Instances; })
			.flatten()
		  .filter(function(instance){
  			if(nowHour <= 6){
  				// midnight - early morning
					if(instance.State["Code"] <= 16){
						// running
						return true;
					}
  			} else {
  				// day time
					if(!(instance.State["Code"] > 16)){
						// not running
						return true;
					}
  			}
			})
	    .pluck("InstanceId")
			.map(function(instanceIds){
				var param = { InstanceIds: [].concat(instanceIds) };
				if(nowHour <= 6){
					console.log("shutting down: " + instanceIds);
					ec2.stopInstances(param, function(err, data) {
					  if (err) console.log(err, err.stack); // an error occurred
					  else     console.log(data);           // successful response
					});
				} else {
					console.log("run: " + instanceIds);
					ec2.stopInstances(param, function(err, data) {
					  if (err) console.log(err, err.stack); // an error occurred
					  else     console.log(data);           // successful response
					});
				}
			});
	});
});

app.listen(process.env.PORT || 3000);



