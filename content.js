var port = chrome.extension.connect({ name: "content" });

if(window.location.href.indexOf('webviewer') !== -1){
  
  document.oncontextmenu = function(ev) {
      
      var obj = ev.target;
      
      while(obj && !obj.hasAttribute('otyp')){
        obj = obj.parentNode;
      }
      
      // Send messages to extension scripts via background
      port.postMessage({element:obj.outerHTML, id:obj.id});
  };
}