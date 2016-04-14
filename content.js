
if(window.location.href.indexOf('webviewer') !== -1){
  
  document.oncontextmenu = function(ev) {
      
      var obj = ev.target;
      
      while(obj && !obj.hasAttribute('otyp')){
        obj = obj.parentNode;
      }
      
      // Send messages to extension
      chrome.extension.sendMessage({element:obj.outerHTML, id:obj.id});
  };
  
  //document.addEventListener("load", function(){
    //console.log(handel_event);
    /*var port = chrome.extension.connect({
        name: "devtools"
    });
    
    port.onMessage.addListener(function (msg) {
      if(msg.sendBack){
        console.log(msg.id);
       // handel_event(msg.id, 'XY', 'responseObj' );
      }
    });*/
  //});
}