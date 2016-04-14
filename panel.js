
var currentObjID;
var currentStyleAttrs = [];
var contentObj      = {};
var prevContentObj  = {};

// ===============================================================================
// Receive Object IDs from content script on right click
// ===============================================================================
//Created a port with background page for continous message communication
var port = chrome.extension.connect({
    name: "devtools"
});

port.onMessage.addListener(function (msg) {
  
  if(msg.clear){
    clear();
  
  // Handle search requests on UI
  }else if(msg.searchAction){
    
    document.body.innerHTML =   document.body.innerHTML.replace(/<span class="searchResult"*>([^<]*)<\/span>/g,'$1');             // reset old marks
    
    if(msg.searchAction !== 'cancelSearch'){
      var msg_search_regex = msg.searchString.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
      
      var regExp = new RegExp(msg_search_regex,'g');
      
      document.body.innerHTML = document.body.innerHTML.replace(regExp,'<span class="searchResult">'+msg.searchString+'</span>'); // set new marks
      
      document.getElementsByClassName("searchResult")[0].scrollIntoView();
    }
  
  // Show right-clicked item data
  }else{
    $('#showAllButton').show();
    currentObjID      = msg.id;
    currentObj        = $(msg.element);
  	currentObjStyle	  = currentObj[0].style;
  	currentStyleAttrs = Object.keys(currentObjStyle);
  		
    $("#objects").html('');
    addObject($("#objects"), currentObjID, contentObj[currentObjID], prevContentObj[currentObjID] || {} );
    
    if(_mode == 'request'){
      toggleView();
    }
  }
});

// ===============================================================================

var _mode = "response";

function toggleView(){
  _mode = (_mode == 'response')? 'request' : 'response';
  
  $('#objectContent').toggle();
  $('#requestContent').toggle();
  
  document.body.style["background-color"] = (_mode == 'response')? "lightgreen" : "lightblue";
  $('#title').html((_mode == 'response')? 'Received Responses / Displayed Objects' : 'Sent Requests' );
  $('#viewToggleButton').html('Show '+((_mode == 'response')? 'Requests' : 'Responses'));
}

$(document).ready(function(){
  
  $('#showAllButton').click(function(){
    currentObjID = currentObj = currentObjStyle = undefined;
    currentStyleAttrs = [];
  	
    $("#objects").html('');
    buildTable($('#objects'),contentObj,prevContentObj);
    $('#showAllButton').hide();
  });
  
  document.body.style["background-color"] = "lightgreen";
  
  $('#requestContent').hide();
  
  $('#viewToggleButton').click(toggleView);
});


  $('#objects').html('');
  
  var messageButtons      = ['OK','YesNo','OKCancel','YesNoCancel'];
  var messageButtonIcons  = ['None','Information','Question','Warning','Error'];
  
  function paramDataToStr(params, props){
    
    var output = '<table>';
    
    if(!params || params.length === 0){ return; }
    
    for(var i=0; i<params.length; i++){
      
      var $param = $(params[i]);
      
      if($param.prop('tagName') == 'SUBMIT'){
        output += '<tr><td>SUBMIT</td><td>'+ paramDataToStr($param.children(),['Uid','DataType']) +'</td></tr>';
      }else{
        
        output += '<tr><td>'+$param.prop('tagName') +'</td><td>'+
          '<table>';
        
            if(props){
              for(var j=0; j<props.length; j++){
                output += '<tr><td>'+props[j]+'</td><td>'+ ($param.prop(props[j]) || $param.attr(props[j]))+'</td></tr>';
              }
            }
            
            output += '<tr><td>Content</td><td>'+$param.html().replace('<!--[CDATA[','').replace(']]-->','')+'</td></tr>';
          
          output += '</table></td></tr>';
      }
    }
      
    output += '</table>';
      
    return output;
  }
  
  function setRequest(requestStr){
    
    $request = $(requestStr);
    
    var parameters = $request.find('Parameters').children();
    
    var output = paramDataToStr(parameters);
    
    $('#requests').prepend('<tr><td>'+output+'</td></tr>');
  }
  
  chrome.devtools.network.onRequestFinished.addListener(
      function(request) {
        
        if(request.request.url.indexOf('mpp?') !== -1){
          
          setRequest(request.request.postData.text);
          
          request.getContent(function(content){
            
            var xmlDoc	= $.parseXML( content );
        		$xml		= $( xmlDoc );
        		
        		// ================================================
            // Clear content when mask changes
        		// ================================================
        		if($xml.find("I[MI][SI]")[0]){
        		  clear();
        		}
        		
        		prevContentObj = jQuery.extend(true, {}, contentObj);
        		
        		// ================================================
            // Message boxes
        		// ================================================
        		//        elem,   parent,     objTag, objIdAttr,typeAttr, childTags,childIdAttr,  properties
        		addContent($xml,  contentObj, "MB",   "I",      null,     "Data",   null,         ["MBT","C","B","DR","I"]);
        		
        		// ================================================
        		// DataGrid
        		// ================================================
        		//addContent2($xml, contentObj, "DSU", "TI", "TI",[{tag:"Data"},{tag:"Column",id:"Name",title:"Columns", value:"DataType"}]);
        		addContent($xml, contentObj, "DSU", "TI", "TI", "Data");
          
        		// ================================================
            // Controls
        		// ================================================
        		addContent($xml, contentObj, "CU", "TI", "CT", "PU", "PN");
        		
        		// ================================================
            // Languages
        		// ================================================
        		addContent($xml, contentObj, "AL", "Languages$$", null, "IETF", "EN");
        		
        		// Clear currently shown content
            $("#objects").html('');
            
        		if(currentObjID){
          		// ================================================
              // Show single object
          		// ================================================
              addObject($("#objects"), currentObjID, contentObj[currentObjID], prevContentObj[currentObjID] || {} );
        		}else{
          		// ================================================
              // Show all objects
          		// ================================================
          		buildTable($('#objects'),contentObj, prevContentObj );
        		}
        		
          });
        }
      }
  );
//});

// ===============================================================================
// Build JSON-Object from backend XML
// ===============================================================================
                //  xml   contentObj CU  TI         CT        PU        PN
function addContent2(elem, parent, objTag, objIdAttr,typeAttr,children, properties){
    
    // Loop over all the tags found for this object type
  	elem.find(objTag).each(function(index,obj){
  	  var $obj     = $(obj);
  	  var parentId = $obj.attr(objIdAttr) || objIdAttr;
  	  
  	  // Add them all to parent with their type
  		if(!parent[parentId]){
  		  parent[parentId] = { properties: {}, children: {} };
  		}
  		
  		// Add defined properties
  		if(properties && properties.length > 0){
    		for(var i=0; i<properties.length;i++){
    		  var propertyObj = {};
    		  propertyObj[properties[i]] = $obj.attr(properties[i]) || $obj.find(properties[i]).html();
    		  parent[parentId].properties[properties[i]] = propertyObj;
    		}
  		}
  		
  		if(typeAttr) parent[parentId].type = $obj.attr(typeAttr);
  		
  		if(children){ // [{tag:"PU",id:"PN",value:""}, ...];
  		  
  		  for(var cIndex=0; cIndex<children.length; cIndex++){
  		    
  		    var childTag    = children[cIndex].tag;
  		    var childIdAttr = children[cIndex].id;
  		    var value       = children[cIndex].value;
  		    var title       = children[cIndex].title;
  		    
      		// Find child tags and add them as well
      		$obj.find(childTag).each(function(index,child){
      		  var $child    = $(child);
            var data      = $child.html().replace('<\![CDATA[','').replace(']]>','');
            
            // DataGrid Content
            if(childTag == "Data" && data.match(/[0-9]+#/g)){ // Should be a DataGrid
              
        			for(var i=30;i>=0;i--){
        				data = data.replace(new RegExp(i+"#","g"),"§§#"+i+": ");
        			}
        			
        			data = data.split('§§');
            }else if($child.attr(childIdAttr) == "CustomAttributes"){
              customAttrs = {};
              $(data).find("CustomAttribute").each(function(index,attribute){
                customAttrs[$(attribute).attr("key")] = $(attribute).attr("value");
              });
              
              data = customAttrs;
            }else{
              if(title){
                parent[parentId][title] = parent[parentId][title] || {};
                console.log($child);
                parent[parentId][title][$child.attr(childIdAttr)] = value? $child.attr(value) : $child.html();
              }else{
          		  parent[parentId][$child.attr(childIdAttr)] = 'asd'; //$child.attr(children[cIndex].value) || $child.html();
              }
            }
            
            parent[parentId].children[(childIdAttr)? $child.attr(childIdAttr) : 'Data'] = data;
      		});
  		  }
  		}else{
          parent[parentId].children["$Text"] = $obj.html();
  		}
  	});
}

function addContent(elem, parent, objTag, objIdAttr,typeAttr,childTag, childIdAttr, properties){
    
    // Loop over all the tags found for this object type
  	elem.find(objTag).each(function(index,obj){
  	  var $obj     = $(obj);
  	  var parentId = $obj.attr(objIdAttr) || objIdAttr;
  	  
  	  // Add them all to parent with their type
  		if(!parent[parentId]){
  		  parent[parentId] = { properties: {}, children: {} };
  		}
  		
  		// Add defined properties
  		if(properties && properties.length > 0){
    		for(var i=0; i<properties.length;i++){
    		  var propertyObj = {};
    		  propertyObj[properties[i]] = $obj.attr(properties[i]) || $obj.find(properties[i]).html();
    		  parent[parentId].properties[properties[i]] = propertyObj;
    		}
  		}
  		
  		if(typeAttr) parent[parentId].type = $obj.attr(typeAttr);
  		
  		if(childTag){
    		// Find child tags and add them as well
    		$obj.find(childTag).each(function(index,child){
    		  var $child    = $(child);
          var data      = $child.html().replace('<\![CDATA[','').replace(']]>','');
          
          // DataGrid Content
          if(childTag == "Data" && data.match(/[0-9]+#/g)){ // Should be a DataGrid
            
      			var columns     = $obj.find('ColumnDefinitions').children();
            var columnCount = columns.length;
            
      			for(var i=30;i>=0;i--){
      				data = data.replace(new RegExp(i+"#","g"),"§§#"+i+": ");
      			}
      			
      			// Split separate fields
      			data = data.split('§§').slice(1);
            
            // Create table from grid data
      			var dataTab     = '<table class="gridDataTab" style>';
      			var colHeaders  = '<tr><th>LINE</th>';
      			var colGroup    = '<colgroup><col class="lineCol" />';
      			
      			for(i=0; i<columnCount; i++){
      			  colHeaders += '<th>'+$(columns[i]).attr('Name')+'</th>';
      			  colGroup   += '<col class="col'+i+'"/>';
      			}
      			
      			colHeaders += '</tr>';
      			colGroup   += '</colgroup>';
      			
      			dataTab += colGroup + colHeaders;
      			
      			// Run through fields, add new line each time the last column is reached
      			var lineCnt = 0;
      			for(i=0; i<data.length; i++){
      			  
      			  if(i%columnCount === 0){
      			    dataTab += '<tr><td>'+(lineCnt++)+'</td>';
      			  } 
      			  
      			  dataTab += '<td>'+data[i]+'</td>';
      			  
      			  if((i+1)%columnCount === 0){
      			    dataTab += '</tr>';
      			  } 
      			}
      			
      			data = dataTab + '</table>';
        			
          }else if($child.attr(childIdAttr) == "CustomAttributes"){
            customAttrs = {};
            $(data).find("CustomAttribute").each(function(index,attribute){
              customAttrs[$(attribute).attr("key")] = $(attribute).attr("value");
            });
            
            data = customAttrs;
          }
          
          parent[parentId].children[(childIdAttr)? $child.attr(childIdAttr) : 'Data'] = data;
    		});
  		}else{
          parent[parentId].children["$Text"] = $obj.html();
  		}
  	});
}


// ===============================================================================
// Add all objects to requests table
// ===============================================================================
function buildTable(tab, obj, prevObj){
	var objectKeys = Object.keys(obj);
	for(var i=0;i<objectKeys.length;i++){
	  addObject(tab, objectKeys[i], obj[objectKeys[i]], prevObj[objectKeys[i]] || {} );
	}
}

// ===============================================================================
// Add single object to requests table
// ===============================================================================
function addObject(tab, key, obj, prevObj){
  
	$('<tr><td><button>Send event</button></td></tr>').appendTo(tab).click(function(){
	  console.log('Sending back item '+key);
    chrome.extension.sendMessage({sendBack:true, id:key});
	});
	
	var row = $('<tr></tr>').appendTo(tab);
	var style;
	row.append('<td>'+key+'</td>');
	  
  var childTab = $('<table></table>').appendTo($('<td></td>').appendTo(row));
  
  var childCollections = Object.keys(obj);
  
  for(var i=0; i<childCollections.length; i++){
    if(childCollections[i] == 'type') continue;
    
    addChildren(childTab, obj[childCollections[i]],   prevObj[childCollections[i]]    || {}, childCollections[i] );
    //addChildren(childTab, obj.children,   prevObj.children    || {} );
    //addChildren(childTab, obj.properties, prevObj.properties  || {} );
    //addChildren(childTab, obj.languages,  prevObj.languages   || {} );
  }
  
  if(currentStyleAttrs && currentStyleAttrs.length > 0){
    var styleTab = $('<table></table>').appendTo($('<td></td>').appendTo(row));
    
  	for(var i=0;i<currentStyleAttrs.length;i++){
  		if(isNaN(currentStyleAttrs[i]) && currentObjStyle[currentStyleAttrs[i]]){
  			styleTab.append('<tr><td>'+currentStyleAttrs[i]+'</td><td>'+currentObjStyle[currentStyleAttrs[i]]+'</td></tr>');
  		}
  	}
  }
}

// ===============================================================================
// Add object children to table
// ===============================================================================
function addChildren(tab,children, prevChildren, collectionName){
  
  if(!children){ return; }
  
  var childKeys = Object.keys(children);
  
  if(!childKeys){ return; }
  
  for(var j=0;j<childKeys.length;j++){
    style = '';
    var child     = children[childKeys[j]];
    var childName = childKeys[j];
    
    if($.isArray(child)){
      var childRow    = $('<tr></tr>').appendTo(tab);
      var childSubTab = $('<table></table>').appendTo($('<td></td>').appendTo(childRow));
      
      for(var m=0;m<child.length;m++){
        childSubTab.append('<tr><td>'+child[m]+'</td></tr>');
      }
    }else{
      style        = (/^#[0-9A-F]{8}$/i.test(child) && child != '#FFFFFFFF')? ' style="color: #'+child.substring(3)+'"' : '';
      
      if(childName == 'CustomAttributes'){
        var custAttrRow   = $('<tr></tr>').appendTo(tab);
        custAttrRow.append('<td>'+childName+'</td>');
        
        var custAttrKeys  = Object.keys(child);
        if(custAttrKeys.length > 0){
          var custAttrTab   = $('<table></table>').appendTo($('<td></td>').appendTo(custAttrRow));
          
          for(var n=0;n<custAttrKeys.length;n++){
            custAttrTab.append('<tr><td>'+custAttrKeys[n]+'</td><td>'+child[custAttrKeys[n]]+'</td></tr>');
          }
        }else{
          custAttrRow.append('<td>-</td>');
        }
      }else{
        var propertyChanged =  (!prevChildren[childName] || prevChildren[childName] != children[childName]);
        tab.append('<tr>'+ (
          propertyChanged?  '<td style="color:blue"><b>'+childName+'</b></td>' : '<td>'+childName+'</td>'
        ) +
        '<td'+style+'>'+child+'</td></tr></tr>' );
      }
    }
  }
}

function clear(){
  currentObjID = undefined;
  currentStyleAttrs = [];
  contentObj      = {};
  prevContentObj  = {};

  $("#objects").html('');
}