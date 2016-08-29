var express = require('express')
var app = express()
 
app.get('/', function (req, res) {
  res.send('Hello World')
})
 
app.listen(3000);

app.get('/sensor_feed/:model?/:id?/:str_pressure?/:str_temperature?', function (req, res){
	var bmp = BMP280Handler()

	var data_package = {
		id: req.params['id'],
		model: req.params['model'],
		str_pressure: req.params['str_pressure'],
		str_temperature: req.params['str_temperature']
	}

	var error_array = bmp.validate(data_package)

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
		var result = []

		if (!validId(data.id)) 							
			{result.push('Unknown Id')}
		if (!validModel(data.model)) 					
			{result.push('Unknown Model')}
		if (!validPressure(data.str_pressure)) 			
			{result.push('Invalid Pressure String')}
		if (!validTemperature(data.str_temperature)) 	
			{result.push('Invalid Temperature String')}

		return result
	}

	return ctrl;
}