var port = chrome.extension.connect({ name: "popup" });

$(document).ready(function(){
	$('#collectButton').click(function(){
	  port.postMessage({fetchHAR:true});
	});
});

chrome.runtime.onMessage.addListener(
  function(request, sender) {
  	console.log(msg);
  }
);

// On tab change => check if metadata available => change icon
chrome.tabs.onActivated.addListener(function (activeInfo){
  
  chrome.tabs.getSelected(null, function(tab){
    _url = tab.url;
  });
  
  chrome.storage.sync.get({enabled:true}, function(options) {
    if(!options.enabled){
      chrome.browserAction.setIcon({path:"res/icon_disabled.png"});
    }else{
      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        chrome.tabs.sendMessage(  tabs[0].id, {method: "getMetadata"},function(response){ 
            chrome.browserAction.setIcon({path: (response && response.metadata)? "res/icon.png":"res/icon_gray.png" }); }
        );
      });
    }
  });
});

