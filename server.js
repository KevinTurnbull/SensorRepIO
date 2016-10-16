console.log("Coming online...");

var express = require('express')
var app = express()
 
app.get('/', function (req, res) {
  res.send('Hello World')
  console.log("Receiving Request");
})
 
app.listen(3000);

app.get('/analysed_feed/:model?/:diff1?/:diff2?/:diff3?/:diff4?', function(req,res){
	var lamFlowCtrl = LamFlowHandler();

	var data_package = {
		model: req.params['model'],
		diff1: Number(req.params['diff1']),
		diff2: Number(req.params['diff2']),
		diff3: Number(req.params['diff3']),
		diff4: Number(req.params['diff4']),
	}

	var error_array = lamFlowCtrl.validate(data_package);

	// Exit early if we have any problems.
	if (error_array.length > 0)
		{console.error(JSON.stringify(error_array));res.send(JSON.stringify(error_array));return;}
	
	console.log("Data Package Read from Get without Error");
	res.send("No Data Integrity Errors");
});

var LamFlowHandler = function(){
	var ctrl = this;
	ctrl.mode = {
		ALLOW_NEGATIVE_DIFFERENCE: true,
		ALLOW_FRACTIONS: true,
		ALLOW_UNDEFINED: true
	}

	validDiff = function(data){
		return (typeof data == "number" || (data === undefined && mode.ALLOW_UNDEFINED))
			&& (data >= 0 || mode.ALLOW_NEGATIVE_DIFFERENCE)
			&& (data % 1 == 0 || mode.ALLOW_FRACTIONS)
	}

	validModel = function(data){
		return data == "lam_flow";
	}

	ctrl.validate = function(data){
		var result = [];

		if (!validModel(data.model))
			result.push("Unknown feed Model: "+data.model)
		for (var i = 1 ; i<=4 ; i++){
			if (!validDiff(data['diff'+i]))
				result.push("diff #"+i+" was found to be invalid.");
		}

		return result;
	}

	return ctrl;
};

// BMP280 Reader
app.get('/sensor_feed/:model?/:id?/:str_pressure?/:str_temperature?', function (req, res){
	var bmpCtrl = BMP280Handler();

	var data_package = {
		id: req.params['id'],
		model: req.params['model'],
		str_pressure: req.params['str_pressure'],
		str_temperature: req.params['str_temperature']
	}

	var error_array = bmpCtrl.validate(data_package)

	// Exit early if we have any problems.
	if (error_array.length > 0)
		{console.error(JSON.stringify(error_array));res.send(JSON.stringify(error_array));return;}
	
	console.log("Data Package Read from Get without Error");
	res.send("No Data Integrity Errors");
})

var BMP280Handler = function(){
	var ctrl = this;

	validId = function(data){return data == 1||data==undefined;}
	validModel = function(data){return data == 'bmp280'||data==undefined;}
	validPressure = function(data){return data.indexOf('kPa') > -1;}
	validTemperature = function(data){return data.indexOf('oC') > -1;}

	ctrl.validate = function(data){
		var result = [];

		if (!validId(data.id)) 							
			{result.push('Unknown Id')}
		if (!validModel(data.model)) 					
			{result.push('Unknown Model')}
		if (!validPressure(data.str_pressure)) 			
			{result.push('Invalid Pressure String')}
		if (!validTemperature(data.str_temperature)) 	
			{result.push('Invalid Temperature String')}

		return result;
	}

	return ctrl;
}