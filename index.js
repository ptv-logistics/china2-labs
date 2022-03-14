var routingProfile = 'car.xml';
var baseLayers;
var routingControl;
var cluster = '-test';

// Required for IE9
$.support.cors = true;

var first = true;

function init() {
	if (!token || first) {
		first = false;
		if (token) {
			$('#tokenInput').val(token);
		}
		$('#Auth').dialog({ minWidth: 600, minHeight: 400 });
	} else {
		initMap();
	}
}

function handleAuth(elmnt,clr) {
    token = document.getElementById("tokenInput").value;
	
	var url = 'https://xserver2-cn' + cluster + '.ptvgroup.cn/services/rest/XMap/tile/0/0/0?xtok=' + token;
	
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
		return [
			L.latLng(31.230416, 121.473701),
			L.latLng(31.250416, 121.483701),		
		];
	};

	// returns a layer group for xmap back- and foreground layers
	var getXMapBaseLayers = function (style) {
		return L.tileLayer('https://xserver2-cn' + cluster + '.ptvgroup.cn/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}' +
			'&xtok={token}', {
				profile: style,
				token: token,
				attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
				maxZoom: 22,
				subdomains: '1234'
			});
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
					serviceUrl: 'https://xserver2-china' + cluster + '.cloud.ptvgroup.com/services/rest/XLocate/locations/',
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
				serviceUrl: 'https://xserver2-cn' + cluster + '.ptvgroup.cn/services/rs/XRoute/',
				token: token,
				supportsHeadings: true,
				beforeSend: function (request) {
					request.storedProfile = routingProfile;
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

	L.control.layers(baseLayers, {}, {
		position: 'bottomleft',
		autoZIndex: false
	}).addTo(map);

	var _onMapLoad = function (e) {
		initializeRoutingControl();
	};


	map.on('load', _onMapLoad, this);
	map.setView([0, 0], 1);
}
