chrome.devtools.panels.create(
    "OMPS",null,
    "panel.html",
    function(panel){
      
      panel.onSearch.addListener(function(action, queryString) {
        chrome.extension.sendMessage({searchAction: action, searchString: queryString});
      });
      
      panel.show();
    }
);



chrome.devtools.network.onRequestFinished.addListener(
  function(entries) {
    if(entries.request.url.match(/http.*index.htm.*/)){
      
      // Send messages to extension
      chrome.extension.sendMessage({inspectedTab: chrome.devtools.inspectedWindow.tabId });
      chrome.extension.sendMessage({clear:true});
    }
  }
);

/*
chrome.devtools.inspectedWindow.getResources(function(resources){
  console.log(resources);
});
*/