var scenario = 'm';
var routingProfile = 'truck40t.xml';
var enableRestrictionZones = false;
var enableTruckAttributes = false;
var enableTrafficIncidents = false;
var enableSpeedPatterns = false;

var baseLayers;
var routingControl;

// Required for IE9
$.support.cors = true;

function init() {
	if (!token) {
		$('#Auth').dialog({ minWidth: 600, minHeight: 400 });
	} else {
		initMap();
	}
}

function handleAuth(elmnt,clr) {
    token = document.getElementById("tokenInput").value;
	
	var url = 'https://xserver2-china.cloud.ptvgroup.com/services/rest/XMap/tile/0/0/0?xtok=' + token;
	
	document.getElementById("error").innerHTML = "Loading...";
	
	$.get(url, function() {
		$('#Auth').dialog('close');
		init();
	}).fail(function () {
		document.getElementById("error").innerHTML = "Invalid token";
	});
}


var map;

function initMap() {
// initialize the map
	map = L.map('map', {
	fullscreenControl: true,
	fullscreenControlOptions: {
		fullscreenElement: document.getElementById('map-container').parentNode // needed for sidebar!
	},
	contextmenu: true,
	contextmenuWidth: 200,
	contextmenuItems: [{
		text: 'Add Waypoint At Start',
		callback: function (ev) {
			if (routingControl._plan._waypoints[0].latLng) {
				routingControl.spliceWaypoints(0, 0, ev.latlng);
			} else {
				routingControl.spliceWaypoints(0, 1, ev.latlng);
			}
		}
	}, {
		text: 'Add Waypoint At End',
		callback: function (ev) {
			if (routingControl._plan._waypoints[routingControl._plan._waypoints.length - 1].latLng) {
				routingControl.spliceWaypoints(routingControl._plan._waypoints.length, 0, ev.latlng);
			} else {
				routingControl.spliceWaypoints(routingControl._plan._waypoints.length - 1, 1, ev.latlng);
			}
		}
	}]
});

// create a new pane for the overlay tiles
map.createPane('tileOverlayPane');
map.getPane('tileOverlayPane').style.zIndex = 500;
map.getPane('tileOverlayPane').style.pointerEvents = 'none';

// get the start and end coordinates for a scenario
var getPlan = function () {
	switch (scenario) {
		case 'm':
			{
				return [
					L.latLng(31.230416, 121.473701),
					L.latLng(39.904211, 116.407395)
				];
			}
		default:
			{ // 'eu'	
				return [
					L.latLng(31.230416, 121.473701),
					L.latLng(39.904211, 116.407395)
				];
			}
	}
};

// returns a layer group for xmap back- and foreground layers
var getXMapBaseLayers = function (style) {
	var bg = L.tileLayer('https://s0{s}-xserver2-china.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}' +
		'&xtok={token}', {
			profile: style,
			token: token,
			attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
			maxZoom: 22,
			subdomains: '1234'
		});

	var fg = L.tileLayer.xserver('https://s0{s}-xserver2-china.cloud.ptvgroup.com/services/rest/XMap/experimental/tile/{z}/{x}/{y}?storedProfile={profile}&layers=labels,{vl1}{vl2}{vl3}{vl4}&contentType=JSON' +
	
	/*
		'&userLanguage={userLanguage}' +
		'&timeConsideration={timeConsideration}' +
		'&referenceTime={referenceTime}&timeSpan={timeSpan}' +
		'&showOnlyRelevantByTime={showOnlyRelevantByTime}' + 
    */		

		'&xtok={token}', {
			profile: style,
			token: token,
			attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
			maxZoom: 22,
			subdomains: '1234',
			timeConsideration: 'SNAPSHOT',
			referenceTime: '2018-01-09T15%3A00%3A00%2B01%3A00',
			timeSpan: 172800,
			showOnlyRelevantByTime: 'false',
			userLanguage: 'de',
			pane: 'tileOverlayPane',
			zIndex: 1,
			isVirtualHost: true,
			vl1: '',
			vl2: '',
			vl3: '',
			vl4: ''
		});

	return L.layerGroup([bg, fg]);
}

var initializeRoutingControl = function () {
	routingControl = L.Routing.control({
		plan: L.Routing.plan(getPlan(), {
			routeWhileDragging: false,
			routeDragInterval: 3000,
			createMarker: function (i, wp) {
				return L.marker(wp.latLng, {
					draggable: true,
					icon: L.icon.glyph({
						glyph: String.fromCharCode(65 + i)
					})
				});
			},
			geocoder: L.Control.Geocoder.ptv({
				serviceUrl: 'https://xserver2-china.cloud.ptvgroup.com/services/rest/XLocate/locations/',
				token: token
			}),
			reverseWaypoints: true
		}),
		lineOptions: {
			styles: [
				// Shadow
				{
					color: 'grey',
					opacity: 0.8,
					weight: 15
				},
				// Outline
				{
					color: 'white',
					opacity: 1,
					weight: 9
				},
				// Center
				{
					color: 'lightblue',
					opacity: 1,
					weight: 6
				}
			]
		},
		router: L.Routing.ptv({
			serviceUrl: 'https://xserver2-china.cloud.ptvgroup.com/services/rs/XRoute/',
			token: token,
			supportsHeadings: true,
			beforeSend: function (request) {
				var blub = $('#reference-date').val() + 'T' + $('#reference-time').val() + $('#time-zone').val();
				request.storedProfile = routingProfile;
				request.routeOptions = {
					'timeConsideration': {
						'$type': 'SnapshotTimeConsideration',
						'referenceTime': $('#reference-date').val() + 'T' + $('#reference-time').val() + $('#time-zone').val()
					}
				}
				request.requestProfile = {
					'featureLayerProfile': {
						'themes': [{
							'enabled': enableTruckAttributes,
							'id': 'PTV_TruckAttributes'
						}, {
							'enabled': enableSpeedPatterns,
							'id': 'PTV_SpeedPatterns'
						}, {
							'enabled': enableTrafficIncidents,
							'id': 'PTV_TrafficIncidents'
						}, {
							'enabled': enableRestrictionZones,
							'id': 'PTV_RestrictionZones'
						}]
					}
				};
				return request;
			}
		}),
		collapsible: true,
		routeWhileDragging: false,
		routeDragInterval: 3000,
		formatter: new L.Routing.Formatter({
			roundingSensitivity: 1000
		})
	}).addTo(map);

	routingControl.on('routingerror', function (e) {});

	L.Routing.errorControl(routingControl).addTo(map);
};

// update ui
$('#scenarioSelect').val(scenario);
$('#routingProfile').val(routingProfile);
$('#enableRestrictionZones').prop('checked', enableRestrictionZones);
$('#enableTruckAttributes').prop('checked', enableTruckAttributes);
$('#enableSpeedPatterns').prop('checked', enableSpeedPatterns);
$('#enableTrafficIncidents').prop('checked', enableTrafficIncidents);

// add side bar
var sidebar = L.control.sidebar('sidebar').addTo(map);
sidebar.open('home');

// add scale control
L.control.scale().addTo(map);

var baseLayers = {
	'PTV gravelpit': getXMapBaseLayers('gravelpit'),
	'PTV sandbox': getXMapBaseLayers('sandbox'),
	'PTV silkysand': getXMapBaseLayers('silkysand'),
	'PTV classic': getXMapBaseLayers('classic'),
	'PTV blackmarble': getXMapBaseLayers('blackmarble'),
	'PTV silica': getXMapBaseLayers('silica').addTo(map)
};

var truckAttributesLayer = L.virtualLayer('PTV_TruckAttributes,', 'vl1');
var restrictionZonesLayer = L.virtualLayer('PTV_RestrictionZones,', 'vl2');
var trafficIncidentsLayer = L.virtualLayer('PTV_TrafficIncidents,', 'vl3');
var speedPatternsLayer = L.virtualLayer('PTV_SpeedPatterns,', 'vl4');

if (enableTruckAttributes)
	map.addLayer(truckAttributesLayer);
if (enableTrafficIncidents)
	map.addLayer(trafficIncidentsLayer);
if (enableRestrictionZones)
	map.addLayer(restrictionZonesLayer);
if (enableSpeedPatterns)
	map.addLayer(speedPatternsLayer);

L.control.layers(baseLayers, {
	'Truck Attributes': truckAttributesLayer,
	'Restriction Zones': restrictionZonesLayer,
	'Traffic Incidents': trafficIncidentsLayer,
	'Speed Patterns': speedPatternsLayer
}, {
	position: 'bottomleft',
	autoZIndex: false
}).addTo(map);

var indSelf = false;

var _onLayerAdd = function (e) {
//	return; // only one-way sync

	if (indSelf) // event was triggered by panel
		return;

	if (e.layer === truckAttributesLayer) {
		enableTruckAttributes = true;
		$('#enableTruckAttributes').prop('checked', enableTruckAttributes);
	} else if (e.layer === trafficIncidentsLayer) {
		enableTrafficIncidents = true;
		$('#enableTrafficIncidents').prop('checked', enableTrafficIncidents);
	} else if (e.layer === speedPatternsLayer) {
		enableSpeedPatterns = true;
		$('#enableSpeedPatterns').prop('checked', enableSpeedPatterns);
	} else if (e.layer === restrictionZonesLayer) {
		enableRestrictionZones = true;
		$('#enableRestrictionZones').prop('checked', enableRestrictionZones);
	} else return;

	if (routingControl)
		routingControl.route();
};

var _onLayerRemove = function (e) {
//	return; // only one-way sync

	if (indSelf) // event was triggered by panel
		return;

	if (e.layer === truckAttributesLayer) {
		enableTruckAttributes = false;
		$('#enableTruckAttributes').prop('checked', enableTruckAttributes);
	} else if (e.layer === trafficIncidentsLayer) {
		enableTrafficIncidents = false;
		$('#enableTrafficIncidents').prop('checked', enableTrafficIncidents);
	} else if (e.layer === speedPatternsLayer) {
		enableSpeedPatterns = false;
		$('#enableSpeedPatterns').prop('checked', enableSpeedPatterns);
	} else if (e.layer === restrictionZonesLayer) {
		enableRestrictionZones = false;
		$('#enableRestrictionZones').prop('checked', enableRestrictionZones);
	} else return;

	if (routingControl)
		routingControl.route();
};

var _onMapLoad = function (e) {
	new L.Control.ReferenceTimeControl().onAdd(map);
	initializeRoutingControl();
};

map.on('layeradd', _onLayerAdd, this);
map.on('layerremove', _onLayerRemove, this);

map.on('load', _onMapLoad, this);
map.setView([0, 0], 1);
}


// update the map scenario
var updateScenario = function () {
	scenario = $('#scenarioSelect option:selected').val();
	updateParams(true);
};

// update the routing params
var updateParams = function (updateWayPoints) {
	routingProfile = $('#vehicleType').val();

	enableRestrictionZones = $('#enableRestrictionZones').is(':checked');
	enableTruckAttributes = $('#enableTruckAttributes').is(':checked');
	enableTrafficIncidents = $('#enableTrafficIncidents').is(':checked');
	enableSpeedPatterns = $('#enableSpeedPatterns').is(':checked');

	// sync panel->layers
	indSelf = true;

	if (enableTruckAttributes)
		map.addLayer(truckAttributesLayer);
	else
		map.removeLayer(truckAttributesLayer);

	if (enableTrafficIncidents)
		map.addLayer(trafficIncidentsLayer);
	else
		map.removeLayer(trafficIncidentsLayer);

	if (enableSpeedPatterns)
		map.addLayer(speedPatternsLayer);
	else
		map.removeLayer(speedPatternsLayer);

	if (enableRestrictionZones)
		map.addLayer(restrictionZonesLayer);
	else
		map.removeLayer(restrictionZonesLayer);

	indSelf = false;

	if (updateWayPoints)
		routingControl.setWaypoints(getPlan());
	routingControl._router.options.numberOfAlternatives = 0;
	routingControl.route();
};