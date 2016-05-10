// Delegate message to all registered ports except the sender itself
function sendToPorts(message, sender){
	var portNames = Object.keys(ports);
	console.log('delegating message');
	console.log(message);

	for(var i=0; i<portNames.length; i++){
		var portName = portNames[i];

		if(portName !== sender.name){
			console.log('from '+sender.name+' to '+portName);
			ports[portName].postMessage(message);
		}
	}
}

// Listen to connecting ports
var ports = {}

// Save ports by script name
chrome.runtime.onConnect.addListener(function (port) {
	console.log("registering "+port.name);
    ports[port.name] = port;
	
	// Delegate received messages to other registered ports
    ports[port.name].onMessage.addListener(function(message, sender){
    	sendToPorts(message, sender);
    });
	
	// Remove port from list when disconnected
	ports[port.name].onDisconnect.addListener(function(port){
		console.log('removing '+port.name);
		delete ports[port.name];
	});
});

// Receive messages from webpage and delegate to all the ports
chrome.runtime.onMessageExternal.addListener(
	function(request, sender) {
		sender.name = "webpage";
		sendToPorts(request, sender);
	}
);

var _inspectedTab;

chrome.extension.onMessage.addListener(function (message, sender) {
      
	if(message.inspectedTab){
		_inspectedTab = message.inspectedTab;
	}

	if(message.sendBack || message.sendRequest || message.sendFingertip){

		var handleEvent = 
			'var element = document.getElementById("backendSender");'+
			'if(element){ element.parentNode.removeChild(element); }'+

			'var script = document.createElement("script");'+
			'script.id = "backendSender";'+
			'script.innerHTML = '+
				((message.sendBack)?        '"handel_event(\''+message.id+'\',\''+(message.event || 'MaskControlMouseLeftButtonDown')+'\');";' : '' ) +
				((message.sendRequest)?     '"doRequest( \''+ message.sendRequest.replace(/"/g,'\\"') +'\', REQUEST_TYP_EVENT, guid() );";' : '' ) +
				((message.sendFingertip)?   '"do_fingertip();";' : '' ) +
			'document.body.appendChild(script);';

		if(!_inspectedTab){
			chrome.tabs.getCurrent(function(tab){
				chrome.tabs.executeScript(tab.id,{code: handleEvent });
			});
		}
		else{
			chrome.tabs.executeScript(_inspectedTab,{code: handleEvent });
		}

		return;
	}

	ports.panel.postMessage(message);
     
});