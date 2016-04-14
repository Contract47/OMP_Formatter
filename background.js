var _inspectedTab;

//Handle request from Content   
chrome.extension.onConnect.addListener(function (port) {
    
    //Posting back to Panel
    chrome.extension.onMessage.addListener(function (message, sender) {
      
      if(message.inspectedTab){
        _inspectedTab = message.inspectedTab;
      }
      
      if(message.sendBack){
        
        var handleEvent = 
          'var element = document.getElementById("backendSender");'+
          'if(element){ element.parentNode.removeChild(element); }'+
          
          'var script = document.createElement("script");'+
          'script.id = "backendSender";'+
          'script.innerHTML = "handel_event(\''+message.id+'\',\'MaskControlMouseLeftButtonDown\');";'+
          'document.body.appendChild(script);';
        
        if(!_inspectedTab){
          chrome.tabs.getCurrent(function(tab){
            chrome.tabs.executeScript(tab.id,{code: handleEvent });
          });
        }
        else{
          chrome.tabs.executeScript(_inspectedTab,{code: handleEvent });
        }
      }
      
      port.postMessage(message);
    });
    
});