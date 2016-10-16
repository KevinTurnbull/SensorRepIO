# SensActIO Proposal
SensActIO is a compression of Sensor-Articulator-Input-Output. The goal of SensActIO is to create a sensor data-buffer webservice for aggregation and first-line event response using NodeJS.

The goal is to push logic away from difficult-to-change microcontrollers and into a rapidly iterable server environment.

The server needs significant flexibility in how it manages requests from the microcontrollers. The server has a number of constraints on it's design:
- Respond quickly to incoming requests with commands for articulators.
- Account for physical or logical differences between different sensor packages.
- Handle requests via GET/POST to the server or (potentially) messages on GPIO Pins.
- Store data in a consistent way regardless of what type of sensor/articulator package was used to report it.

## Server Code
The server must know how to manage all of the settings for different models of microcontroller circuits or by microcontroller api-id. 
To achieve this our namespace hierarchy is as follows:
- The model represents a physical discrete circuit design for the sensor/cpu/wifi package.
- The api-id represents the software package burnt to the chip. 

In some cases - the api-id code will expose sufficient settings to be agnostic between some group of models. To account for this - the model will represent a key for a map of model/api-id pairs. During routing a controller class will be selected based on the api-id code and will handle the request.

### Routing
Routing will be as follows:
- GET /:model/:command/:[NAMED_PARAMS]
	- This is a request coming from a sensor; the :model parameter is used to choose a Server API implementation, the :command parameter will be the requested function of chosen controller and anything which follows are used as ordered parameters for the function indicated by :command.

- POST /:model/:command 
	- This is the preferred method for sending bulk data to the server for processing.

Responses will be built which focus on settings or articulator changes which should occur on the chip based on the server's current understanding of the overall situation.

## Microcontroller Code
The microcontroller code will be focused on 3 paths - the sensor path, settings and the actuator path. 

### Sensor Path
The sensor path will be optimized for sending sensor data to the server. This represents the main synchronous loop of the program. This data may be collected into bulk packages to reduce the number of network connections that are created.

### Settings Path
The settings path will be used to set state parameters for things such as: 
- Sensor maximum package size (number of readings to send as a package)
- Sensor ID settings
- Network SSID / Credentials
- Pin Assignments
- Enabling / Disabling Automatic Actuators
- Soft-Reset / Memory Wipe
- Test Suite

### Actuator Path
The Actuator path is set up to perform actions in the real world. This should be as isolated as possible from the sensor path. The Articulators should be code optimized used to perform a discrete off-circuit action such as moving a . The microcontrollers are to primarilly wait until they get a command from the server before changing anything. There are situations where it will be useful to have the microcontroller perform certain actions without waiting for a response from the server. These on-circuit logic units must provide an interface so they can be disabled/enabled using IO Pins or the settings path. The settings path is preferable.