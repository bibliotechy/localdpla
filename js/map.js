var map = L.map('map');
var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var osmAttrib='Map data © OpenStreetMap contributors';
var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib})
osm.addTo(map);
map.setView([49, -96], 3);
var gjlayers = new L.LayerGroup();
gjlayers.addTo(map);

var info = L.control({position:"bottomleft"});

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info btn'); // create a div with a class "info"
    this.update();
    return this._div;};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = '<h4>DPLA Records</h4>' +  (props ?
        '<b>' + props.name + '</b><br />' + (props.count || "No") + ' records'
        : 'Hover over a state or county');
};

info.addTo(map);

var grades;
var legend = L.control({position: 'bottomright'});

legend.html = function(el,type) {
    grades = [100,500,1000,5000,10000,25000,50000];
    grades = (!type)? grades :grades.map(function(val){ v= val/100; v = (v>1)? v : 0; return v;});
    el.innerHTML = "";
    for (var i = grades.length; i > 0; i--) {
        var props = {count: grades[i -1]};
        if (type == "state"){props.type = "state"}
        el.innerHTML += '<i style="background:' + getColor(props) + '"></i> ';
        if (!props.type){
            el.innerHTML += (grades[i]?  grades[i - 1]/1000  + 'k &ndash;' + grades[i]/1000  + 'k<br>' : grades[i - 1] + '+<br>');
        }
        else {
            el.innerHTML += (grades[i]?  (grades[i - 1])+ ' &ndash;' + (grades[i] -1) + '<br>' : grades[i - 1] + '+<br>');
        }
    }
}

function getColor(props) {
    d = props.count;
    return  d > grades[6] ? '#321414' :
        d > grades[5]  ? '#701C1C' :
            d > grades[4]  ? '#B31B1B' :
                d > grades[3]  ? '#CE1620' :
                    d > grades[2]   ? '#CD5C5C' :
                        d > grades[1]   ? '#FF1C00' :
                            d > grades[0]  ? '#FF6961' :
                                '#FFFAFA';
}


legend.onAdd = function (map) {
    this.div = L.DomUtil.create('div', 'info legend');
    legend.html(this.div);
    return this.div;
};

legend.update = function(type) {
    this.html(this.div,type)
}
legend.addTo(map);

L.control.layers(null,{"Heat Map": gjlayers}).addTo(map);




    var dbase  = 'http://api.dp.la/v2/';
var djsonp = '&callback=JSON_CALLBACK';
var dkey   = '&api_key=9da474273d98c8dc3dc567939e89f9f8';
var dstates = 'items?sourceResource.spatial.country=United+States&page_size=0&facets=sourceResource.spatial.state';

states = function($) {
    var url = dbase + dstates + djsonp + dkey;

    $.ajax({
        type: 'GET',
        url: url,
        async: false,
        jsonpCallback: 'JSON_CALLBACK',
        contentType: "application/json",
        dataType: 'jsonp',
        success: function(dpla) {
            var obj = {};
            dpla.facets['sourceResource.spatial.state'].terms.forEach(function(el) { obj[el.term] = el.count});
            $.getJSON("data/states.js", function(states) {
                states.features.forEach(function(feature, index){feature.properties.count = obj[feature.properties.name]; });
                L.geoJson(states, {style : style, onEachFeature : onEachStateFeature });
            });
        },
        error: function(e) {
            console.log(e.message);
        }
    });
};

function highlightFeature(e) {
    var layer = e.target;
    info.update(layer.feature.properties,name);
}

function style(feature,opacity) {
    return {
        fillColor: getColor(feature.properties),
        weight: 2,
        opacity: (!opacity)? 1 : opacity,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function loadState(e){
    map.fitBounds(e.target.getBounds());
    state =  e.target.feature.properties.name;
    legend.update('state');
    counties($, state)
}


function onEachStateFeature(feature, layer) {
    gjlayers.addLayer(layer);
    layer.on({
        click     : loadState,
        mouseover : highlightFeature
    });
}
states($);

counties = function($, name) {
    var dcounties ='items?sourceResource.spatial.state=' + name + "&fields=sourceResource.spatial.coordinates";
        dcounties += "&page_size=0&facets=sourceResource.spatial.county,sourceResource.spatial.city";
    var url = dbase + dcounties + djsonp + dkey;

    $.ajax({
        type: 'GET',
        url: url,
        async: false,
        jsonpCallback: 'JSON_CALLBACK',
        contentType: "application/json",
        dataType: 'jsonp',
        success: function(dpla) {
            var obj = {};
            dpla.facets['sourceResource.spatial.county'].terms.forEach(function(el) {
                obj[el.term.split(' ').slice(0,-1).join(' ')] = el.count
            });
            $.getJSON("data/" + abbrev[name.toUpperCase()] + ".js", function(counties) {
                counties.features.forEach(function(feature, index){feature.properties.count = obj[feature.properties.name]; });
                L.geoJson(counties, {style : style, onEachFeature : onEachCountyFeature });

            });

        },
        error: function(e) {
            console.log(e.message);
        }
    });

};

function CountyZoomLoad(e) {
    var layer = e.target;
    map.fitBounds(layer.getBounds());

    loadCounty($, layer.feature.properties)
}

function onEachCountyFeature(feature, layer) {
    gjlayers.addLayer(layer);
    layer.on({
        click     : CountyZoomLoad,
        mouseover : highlightFeature
    });
}

loadCounty = function($, props){
var dcounty =  'items?sourceResource.spatial.state=' + encodeURI(deabbrv[props.state]);
    dcounty += '&sourceResource.spatial.county='+  encodeURI(props.name);
    dcounty += '&page_size=100&fields=sourceResource.spatial.coordinates,sourceResource.title,provider.name,isShownAt,object';

var url = dbase + dcounty + djsonp + dkey;
    $.ajax({
        type: 'GET',
        url: url,
        async: false,
        jsonpCallback: 'JSON_CALLBACK',
        contentType: "application/json",
        dataType: 'jsonp',
        success: function(dpla) {
            var obj = {};
            var markers = new L.MarkerClusterGroup();

            dpla.docs.forEach(function(doc){
                try {
                    var cs = (typeof doc['sourceResource.spatial.coordinates'] == 'string')?
                         doc['sourceResource.spatial.coordinates'].split(',') :
                         doc['sourceResource.spatial.coordinates'][0].split(',');
                    if (cs){

                      popup = "<div><p><img src='"+ doc.object +"' /></p><p><a target='_blank' href='" + doc.isShownAt +"'>" +doc['sourceResource.title']+"</a></p><p>from " + doc['provider.name'] +"</p></div>"
                        marker  = L.marker([cs[0],cs[1]]).bindPopup(popup);
                        markers.addLayer(marker);

                    }
                }
                    catch (e) {console.log(e.message)}

                });
            if (dpla.count < dpla.limit) {


            }
              else{

            }
            markers.addTo(map);

            }})
        }

var abbrev  = {"ALABAMA":"AL","ALASKA":"AK","AMERICAN SAMOA":"AS","ARIZONA":"AZ","ARKANSAS":"AR","CALIFORNIA":"CA","COLORADO":"CO","CONNECTICUT":"CT","DELAWARE":"DE","DISTRICT OF COLUMBIA":"DC","FEDERATED STATES OF MICRONESIA":"FM","FLORIDA":"FL","GEORGIA":"GA","GUAM":"GU","HAWAII":"HI","IDAHO":"ID","ILLINOIS":"IL","INDIANA":"IN","IOWA":"IA","KANSAS":"KS","KENTUCKY":"KY","LOUISIANA":"LA","MAINE":"ME","MARSHALL ISLANDS":"MH","MARYLAND":"MD","MASSACHUSETTS":"MA","MICHIGAN":"MI","MINNESOTA":"MN","MISSISSIPPI":"MS","MISSOURI":"MO","MONTANA":"MT", "NEBRASKA":"NE","NEVADA":"NV","NEW HAMPSHIRE":"NH","NEW JERSEY":"NJ","NEW MEXICO":"NM","NEW YORK":"NY","NORTH CAROLINA":"NC","NORTH DAKOTA":   "ND","NORTHERN MARIANA ISLANDS":"MP","OHIO":"OH","OKLAHOMA":"OK","OREGON":"OR","PALAU":"PW","PENNSYLVANIA":"PA","PUERTO RICO":"PR","RHODE ISLAND":"RI","SOUTH CAROLINA":"SC","SOUTH DAKOTA":"SD","TENNESSEE":"TN","TEXAS":"TX","UTAH":"UT","VERMONT":"VT","VIRGIN ISLANDS":"VI","VIRGINIA":"VA","WASHINGTON":"WA","WEST VIRGINIA":"WV","WISCONSIN":"WI","WYOMING":"WY" }
var deabbrv = {'AK': 'ALASKA',
    'AL': 'ALABAMA',
    'AR': 'ARKANSAS',
    'AS': 'AMERICAN SAMOA',
    'AZ': 'ARIZONA',
    'CA': 'CALIFORNIA',
    'CO': 'COLORADO',
    'CT': 'CONNECTICUT',
    'DC': 'DISTRICT OF COLUMBIA',
    'DE': 'DELAWARE',
    'FL': 'FLORIDA',
    'FM': 'FEDERATED STATES OF MICRONESIA',
    'GA': 'GEORGIA',
    'GU': 'GUAM',
    'HI': 'HAWAII',
    'IA': 'IOWA',
    'ID': 'IDAHO',
    'IL': 'ILLINOIS',
    'IN': 'INDIANA',
    'KS': 'KANSAS',
    'KY': 'KENTUCKY',
    'LA': 'LOUISIANA',
    'MA': 'MASSACHUSETTS',
    'MD': 'MARYLAND',
    'ME': 'MAINE',
    'MH': 'MARSHALL ISLANDS',
    'MI': 'MICHIGAN',
    'MN': 'MINNESOTA',
    'MO': 'MISSOURI',
    'MP': 'NORTHERN MARIANA ISLANDS',
    'MS': 'MISSISSIPPI',
    'MT': 'MONTANA',
    'NC': 'NORTH CAROLINA',
    'ND': 'NORTH DAKOTA',
    'NE': 'NEBRASKA',
    'NH': 'NEW HAMPSHIRE',
    'NJ': 'NEW JERSEY',
    'NM': 'NEW MEXICO',
    'NV': 'NEVADA',
    'NY': 'NEW YORK',
    'OH': 'OHIO',
    'OK': 'OKLAHOMA',
    'OR': 'OREGON',
    'PA': 'PENNSYLVANIA',
    'PR': 'PUERTO RICO',
    'PW': 'PALAU',
    'RI': 'RHODE ISLAND',
    'SC': 'SOUTH CAROLINA',
    'SD': 'SOUTH DAKOTA',
    'TN': 'TENNESSEE',
    'TX': 'TEXAS',
    'UT': 'UTAH',
    'VA': 'VIRGINIA',
    'VI': 'VIRGIN ISLANDS',
    'VT': 'VERMONT',
    'WA': 'WASHINGTON',
    'WI': 'WISCONSIN',
    'WV': 'WEST VIRGINIA',
    'WY': 'WYOMING'}
