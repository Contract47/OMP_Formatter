// Connect to messaging system / background
var port = chrome.extension.connect({ name: "panel" });

port.onMessage.addListener(function (msg) {

  if(msg.clear){
	clear();

  // Handle search requests on UI
  }else if(msg.searchAction){

	document.body.innerHTML =   document.body.innerHTML.replace(/<span class="searchResult"*>([^<]*)<\/span>/g,'$1');             // reset old marks

	if(msg.searchAction !== 'cancelSearch'){
	  var msg_search_regex = msg.searchString.replace(/[^\d\w]/g,"."); //replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

	  var regExp = new RegExp(msg_search_regex,'g');

	  document.body.innerHTML = document.body.innerHTML.replace(regExp,'<span class="searchResult">'+msg.searchString+'</span>'); // set new marks

	  document.getElementsByClassName("searchResult")[0].scrollIntoView();
	}

  // View XML was sent from somewhere else
  }else if(msg.respXML){
	handleResponseXML(msg.respXML);

	if(msg.reqXML){ 
		handleRequestXML(msg.reqXML);
	}

  // Show right-clicked item data
  }else if(msg.element){
	$('#showAllButton').show();
	debugger;
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

var currentObjID;
var currentStyleAttrs = [];
var contentObj      = {};
var prevContentObj  = {};

function showNewRequest(){
	$('#newRequestData').toggle();
	$('#sendRequestButton').toggle();
}

function sendRequest(){
	port.postMessage({ sendRequest: $('#newRequestData').val() });
}

function sendFingertip(){
	port.postMessage({ sendFingertip: true });
}

var _mode = "response";

function toggleView(){
  _mode = (_mode == 'response')? 'request' : 'response';
  
  $('#objectContent').animate({'width': 'toggle', opacity:'toggle', duration:1000});
  $('#requestContent').animate({'width': 'toggle', opacity:'toggle', duration:1000});

  if(_mode == 'response'){
	$(document.body).css('background-position','100%');
  }else{
	$(document.body).css('background-position','0%');
  }
	
  $('#title').html((_mode == 'response')? 'Received Responses / Displayed Objects' : 'Sent Requests' );
  $('#title').css({
  	color: (_mode == 'response')? '#50AFB9' : '#8E528E',  	
	"background-color": (_mode == 'response')? 'rgba(94, 210, 236, 0.35)' : 'rgba(210, 94, 236, 0.35)'
  });
  $('.gridMeta').css({
  	"background-color": (_mode == 'response')? '#068A98' : '8A0698'
  })

  $('button').css({
  	"background-image": (_mode == 'response')? 
  							'linear-gradient(to bottom, rgba(106, 241, 255, 0.45), rgba(75, 199, 148, 0.58))' :
  							'linear-gradient(to bottom, rgba(241, 106, 255, 0.45), rgba(199, 75, 148, 0.58))'
  })
  $('#viewToggleButton').html('Show '+((_mode == 'response')? 'Requests' : 'Responses'));
}

$(document).ready(function(){
  
  $('#newRequestButton').click(showNewRequest);
  $('#sendRequestButton').click(sendRequest);
  $('#fingertipButton').click(sendFingertip);
  $('#showReqXMLButton').click(function(){
  	$('#requests').toggle();
  	$('#requestXML').toggle();
  });
  $('#showObjXMLButton').click(function(){
  	$('#objects').toggle();
  	$('#objectXML').toggle();
  });
  
  $('#showAllButton').click(function(){
    currentObjID = currentObj = currentObjStyle = undefined;
    currentStyleAttrs = [];
  	
    $("#objects").html('');
    buildTable($('#objects'),contentObj,prevContentObj);
    $('#showAllButton').hide();
  });
  
  $('#requestContent').animate({'width': 'toggle', duration:0});
  
  $('#viewToggleButton').click(toggleView);

  $('#clearRequests').click(function(){
    $('#requests').html('');
  });
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
            
            var content = $param.html().replace('<!--[CDATA[','').replace(']]-->','');
            
            if(content.match(/[0-9]+:.*#/g)){
              content = gridDataToTab(content, null, content.split(':')[0]);
            }
            
            output += '<tr><td>Content</td><td>'+content+'</td></tr>';
          
          output += '</table></td></tr>';
      }
    }
      
    output += '</table>';
      
    return output;
  }
  
  function handleRequestXML(requestStr){
  	$('#requestXML').text(requestStr);
    
    $('#newRequestData').val(requestStr);
    
    $request = $(requestStr);
    
    var parameters = $request.find('Parameters').children();
    
    var output = paramDataToStr(parameters);
    
    $('#requests').prepend('<tr><td>'+output+'</td></tr>');
  }
  
  function handleResponseXML(content){
  	$('#objectXML').text(content);
  	
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
  }
  
  chrome.devtools.network.onRequestFinished.addListener(
  
      function(request) {
        
        if(request.request.url.indexOf('mpp?') !== -1){
		  
          handleRequestXML(request.request.postData.text);
          
          request.getContent(function(content){ handleResponseXML(content); });
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

function gridDataToTab(data, columns, columnCount){
    
    var columnList = [];

    columnCount = (columns)? columns.length : columnCount;
	
    /*for(var i=99;i>=0;i--){
        data = data.replace(new RegExp(i+"#","g"),"§§#"+i+": ");
    }*/

    var data = data.split('#');
	
	var nextLength = data[0];
	data = data.slice(1);

	for(var i=0; i<data.length; i++){
	  var dataObj		= { length: nextLength };
	  var value      	= data[i].substring(0,nextLength);
	  nextLength 		= data[i].substring(nextLength, data[i].length);
	  dataObj.value 	= value;

	  data[i] = dataObj;
	}

    // Split separate fields
    //data = data.split('§§').slice(1);
	
	var gridObj		= [];
	var lineObj;

    // Create table from grid data
    var dataTab     = '<table class="gridDataTab" style>';
    var colHeaders  = '<tr><th>LINE</th>';
    var colGroup    = '<colgroup><col class="lineCol" />';
    
    if(columns){
      for(i=0; i<columnCount; i++){
		columnList.push({
			caption:	$(columns[i]).find('Caption').html(), 
			field: 		$(columns[i]).attr('Name'), 
			type: 		$(columns[i]).attr('DataType'),
			cellstyle:	{}
		});
		
		$(columns[i]).find('CellStyle').find('Setter').each(function(index,setter){
			columnList[i].cellstyle[$(setter).attr('Property')] = $(setter).attr('Value');
		});
		
        colHeaders += '<th><div>'+
        					( columnList[i].caption? columnList[i].caption+'('+columnList[i].field+')' : columnList[i].field )+
        			  '</div><div class="gridMeta">'+
							columnList[i].type+
        			  '</div>';
        
        var styles = Object.keys(columnList[i].cellstyle);

        if(styles && styles.length > 0){
        	colHeaders += '<a class="cellstyleHeader">Style</a><div class="cellstyleTab"><table>';
			
			for(var j=0; j<styles.length; j++){
				colHeaders += '<tr><td>'+styles[j]+'</td><td>'+columnList[i].cellstyle[styles[j]]+'</td></tr>';
			}

			colHeaders += '</table></div>';
        }

        			  '</th>';
        colGroup   += '<col class="col'+i+'"/>';
      }
    
      colGroup   += '</colgroup>';
      colHeaders += '</tr>';

      dataTab += colGroup + colHeaders;
    }

    // Run through fields, add new line each time the last column is reached
    var lineCnt = 0;
    for(i=0; i<data.length; i++){

      if(i%columnCount === 0){
        dataTab += '<tr><td>'+(lineCnt++)+'</td>';
        lineObj		= {};
      } 

      dataTab += '<td><div'+ ((data[i].value === "")?' style="color:grey"' : '') +'>'+ ((data[i].value === "")? 'N/A' : data[i].value )+'</div><div class="gridMeta">'+data[i].length+'</div></td>';

      if(columns){
      	var column = columnList[i%columnCount];

      	if(!column.caption || lineObj[column.caption])	{	lineObj[column.field] = data[i].value.trim();	}
      	else											{	lineObj[column.caption] = data[i].value.trim();	}
      }

      if((i+1)%columnCount === 0){
        dataTab += '</tr>';
        gridObj.push(lineObj);
      } 
    }

    return dataTab + '</table><textarea style="width:100%">'+JSON.stringify(gridObj, null, "\t")+'</textarea>';
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
            
      		data = gridDataToTab(data, columns);
        			
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
  
	$('<button>Send event</button>').
	appendTo(
	   $('<td></td>').appendTo(
	     $('<tr></tr>').appendTo(tab)
	   ).append(
        '<select id="'+key+'EventSelector">'+
        '<option>MaskControlKeyEnterPressed</option>'+
        '<option>MaskControlMouseLeftButtonDown</option>'+
        '<option>MaskControlMouseRightButtonDown</option>'+
        '<option>MaskControlMouseDoubleClick</option>'+
        '<option>MaskControlMouseEnter</option>'+
        '<option>MaskControlSelectionChanged</option>'+
        '</select>'
      )
    ).click(function(){
	    console.log('Sending back item '+key+', event '+ $('#'+key+'EventSelector option:selected' ).text() );
        port.postMessage({sendBack:true, id:key, event: $('#'+key+'EventSelector option:selected' ).text() });
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