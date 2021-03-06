var _	= require('lodash-node'),
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

app.listen(process.env.PORT || 3000);



