#! /usr/bin/env node
var _	= require('lodash-node'),
	moment_jp = require('moment')().zone("+09:00"),
  _s	= require('underscore.string'),
  AWS	= require('aws-sdk');

// set AWS configuration
AWS.config.update({
	"accessKeyId": _s.trim(process.env.AWS_ACCESS_KEY_ID),
	"secretAccessKey": _s.trim(process.env.AWS_SECRET_ACCESS_KEY),
	"region": _s.trim(process.env.AWS_REGION)
});

var getParams = function(tag_string){
	if(!tag_string || tag_string.length <= 0){ return {Filters: []} }

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
	return {Filters: filters};
}


var ec2 = new AWS.EC2();
var params = getParams(_s.trim(process.env.AWS_FRONT_TAGS));
ec2.describeInstances(params, function (err, data) {
	if(err){
		console.log(err, err.stack);
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
				if(instance.State["Code"] > 16){
					// not running
					return true;
				}
			}
		})
    .pluck("InstanceId")
		.map(function(instanceIds){
			console.log(instanceIds);
			var param = { InstanceIds: [].concat(instanceIds) };
			if(nowHour <= 6){
				console.log("shutting down: " + instanceIds);
				ec2.stopInstances(param, function(err, data) {
				  if (err) console.log(err, err.stack); // an error occurred
				  else     console.log(data);           // successful response
				});
			} else {
				console.log("run: " + instanceIds);
				ec2.startInstances(param, function(err, data) {
				  if (err) console.log(err, err.stack); // an error occurred
				  else     console.log(data);           // successful response
				});
			}
	});
});
