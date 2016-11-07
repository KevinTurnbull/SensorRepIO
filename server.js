console.log("Coming online...");

var express = require('express');
var app = express();

var firebase = require("firebase");
firebase.initializeApp({
	databaseURL: "https://sensactio.firebaseio.com",
	serviceAccount: "firebase_cert.json"
});

var db = firebase.database();
 
app.get('/', function (req, res) {
  res.send('Hello World')
  console.log("Receiving Request");
})
 
app.listen(3000);

app.get('/flush_db', function(req,res){
	var sense = db.ref("analysed_feed");
		sense.remove();
	sense = db.ref("sensor_feed");
	sense.remove();

	res.send("Database Flushed");
});

app.get('/analysed_feed/:model?/:diff1?/:diff2?/:diff3?/:diff4?', function(req,res){
	var lamFlowCtrl = LamFlowHandler();

	var data_package = {
		model: req.params['model'],
		diff1: Number(req.params['diff1']),
		diff2: Number(req.params['diff2']),
		diff3: Number(req.params['diff3']),
		diff4: Number(req.params['diff4']),
	}

	data_package.timestamp = Date.now();

	var error_array = lamFlowCtrl.validate(data_package);

	// Exit early if we have any problems.
	if (error_array.length > 0)
		{console.error(JSON.stringify(error_array));res.send(JSON.stringify(error_array));return;}

	var sensorRepository = db.ref("analysed_feed");

	sensorRepository.push().set(data_package);
	
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

// Create a variable and bind it to the settings/sous_vide node on firebase
var sousVideSettings = {setPoint: 50};	// Default setPoint of 50
db.ref("settings/sous_vide").on("value", function(snapshot){sousVideSettings = snapshot.val();});

var DS18B20_SousVide_Controller = function(req, res){
	console.log("Received: ",req.params['str_temperature']);

	// What are the current temperature and desired set point?
	var curr_temp = parseInt(req.params['str_temperature']);
	var setPoint = sousVideSettings.setPoint || 50;

	// Pre-process the booleans we'll need (for readability)
	var isUnderSetpoint = (curr_temp<setPoint);
	var isHighDifference = isUnderSetpoint && (setPoint - curr_temp) > 10;

	console.log(curr_temp+ '<'+ setPoint+ '?'+(isUnderSetpoint));
	if (!isUnderSetpoint)
		{res.send("H0");console.log("Command: Turn OFF the Main Power");}
	else if (isHighDifference)
		{res.send("H1");console.log("Command: Turn ON the Main Power");}
	else 
		{res.send("T55");console.log("Command: Turn Power ON Half-time");}

	// Load up our database connection
	var sensorRepository = db.ref("sous_vide");

	// This line clears the "sous_vide" area and returns before saving any new one.
	//sensorRepository.remove();return;

	// Create a controller-scope variable for use by the following pair of async tasks.
	var wasLastEnabled = undefined;
	// Get the most recent sensor value
	sensorRepository.orderByChild("timestamp").limitToLast(1).once("value")
		.then(function(mostRecent){
			// Iterate through the 1 item array
			mostRecent.forEach(function(childSnapshot) {
				var childData = childSnapshot.val();
				// Set the controller-scope variable for whether the previous sensor value was to disable or enable
				wasLastEnabled = childData.mode;
			});
		})
		.then(function(){
			// If the current decision is different than the previously stored decision (or previously stored is still undefined)
			if (wasLastEnabled != isUnderSetpoint)
			{	
				// Create a data_package and save it to firebase
				var data_package = {
					timestamp: Date.now(),
					mode: curr_temp<setPoint,
					cur_temp: curr_temp,
					set_point: setPoint
				}

				sensorRepository.push(data_package);
			}
		})

}
app.get('/sous_vide/ds18b20/:str_temperature?', DS18B20_SousVide_Controller);


// BMP280 Reader
var BMP280Controller = function (req, res){
	var bmpCtrl = BMP280Handler();

	var data_package = {
		id: req.params['id'],
		model: req.params['model'],
		str_pressure: req.params['str_pressure'],
		str_temperature: req.params['str_temperature']
	};

	data_package.timestamp = Date.now();

	var error_array = bmpCtrl.validate(data_package)

	// Exit early if we have any problems.
	if (error_array.length > 0)
		{console.error(JSON.stringify(error_array));res.send(JSON.stringify(error_array));return;}
	
	var sensorRepository = db.ref("sensor_feed");

	sensorRepository.push().set(data_package);

	console.log("Data Package Read from Get without Error");
	console.log(JSON.stringify(data_package));

	res.send("No Data Integrity Errors");
};
app.get('/sensor_feed/:model?/:id?/:str_pressure?/:str_temperature?', BMP280Controller);

var BMP280Handler = function(){
	var ctrl = this;

	validId = function(data){return data == 1||data == 2||data == 3||data==undefined;}
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