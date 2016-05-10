// Connect to messaging system / background
var port = chrome.extension.connect({ name: "devtools" });

port.onMessage.addListener(function (msg) {
  if(msg.fetchHAR){
    chrome.devtools.network.getHAR(function(result){
      window.open('data:text/js;charset=utf-8,' + escape(JSON.stringify(result,null,"\t")));
    });
  }
});

chrome.devtools.panels.create(
    "OMPS",null,
    "panel.html",
    function(panel){
      
      panel.onSearch.addListener(function(action, queryString) {
        port.postMessage({searchAction: action, searchString: queryString});
      });
      
      panel.show();
    }
);

chrome.devtools.network.onRequestFinished.addListener(
  function(entries) {
    if(entries.request.url.match(/http.*index.htm.*/)){
      
      // Send messages to extension
      port.postMessage({inspectedTab: chrome.devtools.inspectedWindow.tabId });
      port.postMessage({clear:true});
    }
  }
);