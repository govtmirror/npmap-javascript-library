﻿// TODO: Hook up attribution.
define([
  'Event',
  'Map/Map',
  'Util/Util'
], function(Event, Map, Util) {
  var
      // An array of the default base layers for Bing.
      DEFAULT_BASE_LAYERS = [{
        code: 'aerial',
        type: 'Aerial'
      },{
        code: 'auto',
        type: 'Generic'
      },{
        code: 'birdseye',
        type: 'Generic'
      },{
        code: 'mercator',
        type: 'Generic'
      },{
        code: 'road',
        type: 'Street'
      }],
      // The activeBaseLayer object.
      activeBaseLayer,
      // Has the map been double-clicked?
      doubleClicked = false,
      // Is there at least one clustered layer in the map?
      hasClustered = NPMap.Map.hasClusteredLayer(),
      // Is there at least one tiled layer in the map?
      hasTiled = NPMap.Map.hasTiledLayer(),
      // The initial center lat/lng of the map.
      initialCenter,
      // The initial zoom of the map.
      initialZoom,
      // The map object.
      map,
      // The mapTypeId to initialize the map with.
      mapTypeId,
      // The max zoom level to initialize the map with.
      max = 20,
      // The min zoom level to initialize the map with.
      min = 0,
      // Is the left mouse button currently being pressed?
      mouseDown = false,
      // The old center latLng of the map.
      oldCenter,
      // The old cursor.
      oldCursor,
      // The old icon used for the last marker that the mouse moved over.
      oldIcon = null,
      // The old "target" that the mouse moved over.
      oldTarget = null,
      // The old zoom level of the map.
      oldZoom,
      //
      panStartReported = false,
      // Has the map view changed?
      viewChanged = false,
      //
      zoomStartReported = false;

  /**
   * Checks to see if the map is currently zoomed in further out/in than it is supposed to and repositions it, if needed.
   */
  function checkMaxMinZoom() {
    var range = map.getZoomRange(),
        max = range.max,
        min = range.min;
    
    if (map.getZoom() < min) {
      map.setView({
        animate: false,
        center: oldCenter,
        zoom: min
      });
    } else if (map.getZoom() > max && map.getMapTypeId() != 'be') {
      map.setView({
        animate: false,
        center: oldCenter,
        zoom: max
      });
    }
  }
  /**
   * Converts a HEX color to RGB.
   * @param {String} hex The HEX string to convert.
   * @returns {String}
   */
  function hexToRgb(hex) {
    var i = 3,
        rgb = hex.replace('#', '').match(/(.{2})/g);
        
    while (i--) {
      rgb[i] = parseInt(rgb[i], 16);
    }
    
    return rgb;
  }
  
  if (NPMap.config.baseLayers) {
    for (var i = 0; i < NPMap.config.baseLayers.length; i++) {
      var baseLayer = NPMap.config.baseLayers[i],
          visible = baseLayer.visible;

      if (typeof visible === 'undefined' || visible === true) {
        activeBaseLayer = baseLayer;
        break;
      }
    }
  } else if (typeof NPMap.config.baseLayers === 'undefined') {
    NPMap.config.baseLayers = [];
  } else {
    activeBaseLayer = {
      code: 'mercator',
      visible: true
    };

    NPMap.config.baseLayers = [
      activeBaseLayer
    ];
  }

  if (!activeBaseLayer) {
    activeBaseLayer = {
      code: 'auto',
      visible: true
    };
    
    NPMap.config.baseLayers.push(activeBaseLayer);
  }

  if (activeBaseLayer.code === 'aerial' || activeBaseLayer.code === 'auto' || activeBaseLayer.code === 'birdseye' || activeBaseLayer.code === 'mercator' || activeBaseLayer.code === 'road') {
    mapTypeId = Microsoft.Maps.MapTypeId[activeBaseLayer.code];
  } else {
    if (!activeBaseLayer.zIndex) {
      activeBaseLayer.zIndex = 0;
    }

    mapTypeId = Microsoft.Maps.MapTypeId.mercator;
  }
  
  map = new Microsoft.Maps.Map(document.getElementById(NPMap.config.div), {
    center: NPMap.config.center ? new Microsoft.Maps.Location(NPMap.config.center.lat, NPMap.config.center.lng) : new Microsoft.Maps.Location(39, -96),
    credentials: NPMap.config.credentials ? NPMap.config.credentials : 'AqZQwVLETcXEgQET2dUEQIFcN0kDsUrbY8sRKXQE6dTkhCDw9v8H_CY8XRfZddZm',
    disableKeyboardInput: NPMap.config.tools && !NPMap.config.tools.keyboard ? true : false,
    mapTypeId: mapTypeId,
    showCopyright: false,
    showDashboard: false,
    showLogo: false,
    showScalebar: false,
    zoom: NPMap.config.zoom || 4
  });
  initialCenter = map.getCenter();
  initialZoom = map.getZoom();

  if (NPMap.config.restrictZoom) {
    if (NPMap.config.restrictZoom.max) {
      if (NPMap.config.restrictZoom.max === 'auto') {
        max = map.getZoom();
      } else {
        max = NPMap.config.restrictZoom.max;
      }
    }

    if (NPMap.config.restrictZoom.min) {
      if (NPMap.config.restrictZoom.min === 'auto') {
        min = map.getZoom();
      } else {
        min = NPMap.config.restrictZoom.min;
      }

      if (min < 3) {
        min = 3;
      }
    }
  }

  map.getZoomRange = function() {
    return {
      max: max,
      min: min
    };
  };

  Microsoft.Maps.Events.addHandler(map, 'click', function(e) {
    doubleClicked = false;

    Map.setCursor(oldCursor);
    setTimeout(function() {
      if (!doubleClicked && !viewChanged && e.isPrimary === true) {
        if (e.targetType === 'map' || e.target.allowClickThrow === true) {
          Event.trigger('NPMap.Map', 'click', e.originalEvent);
        } else {
          if (e.target.clickHandler) {
            e.target.clickHandler(e.target);
          }

          Event.trigger('NPMap.Map', 'shapeclick', e.originalEvent);
        }
      }
    }, 350);
  });
  Microsoft.Maps.Events.addHandler(map, 'dblclick', function(e) {
    doubleClicked = true;

    Map.setCursor(oldCursor);
    Event.trigger('NPMap.Map', 'dblclick', e.originalEvent);
  });
  Microsoft.Maps.Events.addHandler(map, 'mousedown', function(e) {
    mouseDown = true;
    viewChanged = false;

    Map.setCursor('move');
    Event.trigger('NPMap.Map', 'mousedown', e.originalEvent);

    if (e.originalEvent.shiftKey) {
      e.handled = true;
    }
  });
  Microsoft.Maps.Events.addHandler(map, 'mousemove', function(e) {
    if (mouseDown) {
      Map.setCursor('move');
    } else {
      Map.setCursor('auto');
    
      if (oldIcon && oldTarget) {
        oldTarget.setOptions({
          icon: oldIcon
        });
        
        oldIcon = null;
        oldTarget = null;
      }

      if (e.targetType !== 'map' && e.target && !e.target.allowClickThrough) {
        Map.setCursor('pointer');
        
        if (e.target.data && e.target.data.overIcon) {
          oldIcon = e.target.getIcon();
          oldTarget = e.target;

          if (oldIcon !== e.target.data.overIcon) {
            e.target.setOptions({
              icon: e.target.data.overIcon
            });
          }
        }
      }

      oldCursor = map.getRootElement().style.cursor;
    }

    Event.trigger('NPMap.Map', 'mousemove', e.originalEvent);

    return false;
  });
  Microsoft.Maps.Events.addHandler(map, 'mouseout', function(e) {
    Event.trigger('NPMap.Map', 'mouseout', e.originalEvent);
  });
  Microsoft.Maps.Events.addHandler(map, 'mouseover', function(e) {
    Event.trigger('NPMap.Map', 'mouseover', e.originalEvent);
  });
  Microsoft.Maps.Events.addHandler(map, 'mouseup', function(e) {
    mouseDown = false;

    Map.setCursor(oldCursor);
    Event.trigger('NPMap.Map', 'mouseup', e.originalEvent);
  });
  Microsoft.Maps.Events.addHandler(map, 'rightclick', function(e) {
    Event.trigger('NPMap.Map', 'rightclick', e.originalEvent);

    e.handled = true;
  });
  Microsoft.Maps.Events.addHandler(map, 'viewchange', function() {
    var bounds =  map.getBounds(),
        inEasternOrWesternHemisphere = function(lng) {
          if (lng < 0) {
            return 'western';
          } else {
            return 'eastern';
          }
        },
        nw = bounds.getNorthwest(),
        nwHemisphere = inEasternOrWesternHemisphere(nw.longitude),
        se = bounds.getSoutheast(),
        seHemisphere = inEasternOrWesternHemisphere(se.longitude);

    if ((map.getZoom() === oldZoom) && oldCenter && !NPMap.Map.latLngsAreEqual(NPMap.Map.latLngFromApi(oldCenter), NPMap.Map.latLngFromApi(map.getCenter()))) {
      if (!panStartReported) {
        Event.trigger('NPMap.Map', 'panstart');

        panStartReported = true;
      }

      Event.trigger('NPMap.Map', 'panning');
    }

    if (map.getZoom() !== oldZoom) {
      if (!zoomStartReported) {
        Event.trigger('NPMap.Map', 'zoomstart');

        zoomStartReported = true;
      }
      
      
      Event.trigger('NPMap.Map', 'zooming');
    }

    viewChanged = true;
    
    if (NPMap.InfoBox.visible) {
      NPMap.InfoBox.reposition();
    }
    
    checkMaxMinZoom();
    Event.trigger('NPMap.Map', 'viewchanging');
  });
  Microsoft.Maps.Events.addHandler(map, 'viewchangeend', function() {
    if (map.getZoom() !== oldZoom) {
      Event.trigger('NPMap.Map', 'zoomend');
    } else if (oldCenter && !NPMap.Map.latLngsAreEqual(NPMap.Map.latLngFromApi(oldCenter), NPMap.Map.latLngFromApi(map.getCenter()))) {
      Event.trigger('NPMap.Map', 'panend');
    }

    oldCenter = map.getCenter();
    oldZoom = map.getZoom();
    panStartReported = false;
    zoomStartReported = false;

    map.getCopyrights(function(a) {
      var attribution = [];
      
      _.each(a, function(v, i) {
        if (!_.isArray(v)) {
          attribution.push(v);
        } else {
          _.each(v, function(v2, i2) {
            attribution.push(v2);
          });
        }
      });

      NPMap.Map.Bing._attribution = attribution;

      NPMap.Map.updateAttribution();
    });
    
    Event.trigger('NPMap.Map', 'viewchangeend');
  });
  Microsoft.Maps.Events.addHandler(map, 'viewchangestart', function() {
    oldCenter = map.getCenter();
    oldZoom = map.getZoom();
    viewChanged = true;
    
    checkMaxMinZoom();
    Event.trigger('NPMap.Map', 'viewchangestart');
  });
  
  Map._init();

  return NPMap.Map.Bing = {
    //
    _attribution: null,
    // Is the map loaded and ready to be interacted with programatically.
    _isReady: true,
    // The Microsoft.Maps.Map object. This reference should be used to access any of the Bing Maps v7 functionality that can't be done through the NPMap.Map methods.
    map: map,
    /**
     * Adds a shape to the map.
     * @param {Object} shape The shape to add to the map. This can be a Microsoft.Maps.Pushpin, Polygon, or Polyline object.
     */
    addShape: function(shape) {
      map.entities.push(shape);
    },
    /**
     * Adds a tile layer to the map.
     * @param {Object} layer
     */
    addTileLayer: function(layer) {
      map.entities.push(layer);
    },
    /**
     * Converts an API bounds to a NPMap bounds.
     * @param {Object} bounds
     * @return {Object}
     */
    boundsFromApi: function(bounds) {
      return {
        e: bounds.getEast(),
        n: bounds.getNorth(),
        s: bounds.getSouth(),
        w: bounds.getWest()
      };
    },
    /**
     * Converts a NPMap bounds to an API bounds.
     * @param {Object}
     * @return {Object}
     */
    boundsToApi: function(bounds) {
      return Microsoft.Maps.LocationRect.fromEdges(bounds.n, bounds.w, bounds.s, bounds.e);
    },
    /**
     * Centers the map.
     * @param {Object} latLng
     */
    center: function(latLng) {
      map.setView({
        center: latLng
      });
    },
    /**
     * Centers then zooms the map.
     * @param {Microsoft.Maps.Location} latLng The latLng to center the map on.
     * @param {Integer} zoom The zoom level to zoom the map to.
     * @param {Function} callback (Optional) A callback function to call after the map has been centered and zoomed.
     */
    centerAndZoom: function(latLng, zoom, callback) {
      var currentLatLng = this.latLngFromApi(map.getCenter()),
          currentZoom = this.getZoom(),
          me = this;

      if (NPMap.Map.latLngsAreEqual(currentLatLng, this.latLngFromApi(latLng)) === true && (currentZoom === zoom)) {
        if (callback) {
          callback();
        }
      } else {
        var handlerId = Microsoft.Maps.Events.addThrottledHandler(map, 'viewchangeend', function() {
              Microsoft.Maps.Events.removeHandler(handlerId);
          
              if (callback) {
                callback();
              }
            }, 200),
            o = {
              center: latLng,
              zoom: parseInt(zoom, 0)
            };
            
        /*
        if (NPMap.InfoBox && NPMap.InfoBox.visible) {
          var infoBoxLatLng = (function() {
                if (NPMap.InfoBox.marker) {
                  return NPMap.InfoBox.marker.getLocation();
                } else if (NPMap.InfoBox.latLng) {
                  return me.latLngToApi(NPMap.InfoBox.latLng);
                } else {
                  return null;
                }
              })(),
              pixel;

          if (infoBoxLatLng) {
            pixel = this.latLngToPixel(infoBoxLatLng);
            o.centerOffset = new Microsoft.Maps.Point(pixel.x, pixel.y);
          }
        }
        */

        map.setView(o);
      }
    },
    /**
     *
     */
    convertLineOptions: function(options) {

    },
    /**
     *
     */
    convertMarkerOptions: function(options) {
      // Valid Bing Maps options: anchor, draggable, height, icon, infobox, text, textOffset, typeName, visible, width, zIndex
      var o = {};

      if (options.height) {
        o.height = options.height;
      }

      if (options.url) {
        o.icon = options.url;
      }

      if (options.width) {
        o.width = options.width;
      }

      return o;
    },
    /**
     *
     */
    convertPolygonOptions: function(options) {
      // Valid Bing Maps options: fillColor (a (opacity), r, g, b), infobox, strokeColor (a (opacity), r, g, b), strokeDashArray, strokeThickness, visible
      var o = {};

      if (options.fillColor) {
        var fillColor = hexToRgb(options.fillColor),
            fillOpacity = options.fillOpacity || 255;

        o.fillColor = new Microsoft.Maps.Color(fillOpacity, fillColor[0], fillColor[1], fillColor[2]);
      }

      if (options.strokeColor) {
        var strokeColor = hexToRgb(options.strokeColor),
            strokeOpacity = options.strokeOpacity || 255;

        o.strokeColor = new Microsoft.Maps.Color(strokeOpacity, strokeColor[0], strokeColor[1], strokeColor[2]);
      }
      
      if (options.strokeWidth) {
        o.strokeThickness = options.strokeWidth;
      }
      
      return o;
    },
    /**
     * Creates a Microsoft.Maps.Polyline object.
     * @param {Array} latLngs An array of {Microsoft.Maps.Location} objects.
     * @param {Microsoft.Maps.PolylineOptions} options (Optional) Any additional options to apply to the line.
     * @return {Microsoft.Maps.Polyline}
     */
    createLine: function(latLngs, options) {
      options = options || {};

      return new Microsoft.Maps.Polyline(latLngs, options);
    },
    /**
     * Creates a Microsoft.Maps.Pushpin object.
     * @param latLng {Microsoft.Maps.Location} (Required) Where to place the marker.
     * @param options {Microsoft.Maps.PushpinOptions} (Optional) Any additional options to apply to the marker.
     * @return {Microsoft.Maps.Pushpin}
     */
    createMarker: function(latLng, options) {
      options = options || {};
      
      if (!options.anchor || !options.height || !options.width) {
        if (options.height && options.width) {
          options.anchor = new Microsoft.Maps.Point(options.width / 2, options.height / 2);
        } else if (options.icon) {
          var image = new Image(),
              interval;

          image.src = options.icon;
          interval = setInterval(function() {
            if (image.height > 0 && image.width > 0) {
              var height = image.height,
                  width = image.width,
                  anchor = options.anchor || new Microsoft.Maps.Point(width / 2, height / 2);
              
              clearInterval(interval);
                  
              if (!marker) {
                options.anchor = anchor;
                options.height = height;
                options.width = width;
              } else {
                marker.setOptions({
                  anchor: anchor,
                  height: height,
                  width: width
                });
              }
            }
          }, 10);
        }
      }

      return new Microsoft.Maps.Pushpin(latLng, options);
    },
    /**
     * Creates a Microsoft.Maps.Polygon object.
     * @param latLngs {Array} (Required) An array of Microsoft.Maps.Location objects.
     * @param options {Microsoft.Maps.PolygonOptions} (Optional) Any additional options to apply to the polygon.
     * @return {Microsoft.Maps.Polygon}
     */
    createPolygon: function(latLngs, options) {
      options = options || {};

      return new Microsoft.Maps.Polygon(latLngs, options);
    },
    /**
     * Creates a tile layer.
     * @param {String/Function} constructor
     * @param {Object} options (Optional)
     */
    createTileLayer: function(constructor, options) {
      var getSubdomain = null,
          uriConstructor;

      options = options || {};

      if (options.subdomains) {
        var currentSubdomain = 0;

        getSubdomain = function() {
          if (currentSubdomain + 1 === options.subdomains.length) {
            currentSubdomain = 0;
          } else {
            currentSubdomain++;
          }

          return options.subdomains[currentSubdomain];
        };
      }

      if (typeof constructor === 'string') {
        uriConstructor = function(tile) {
          var template = _.template(constructor),
              uri = template({
                x: tile.x,
                y: tile.y,
                z: tile.levelOfDetail
              });

          if (getSubdomain) {
            uri = uri.replace('{{s}}', getSubdomain());
          }
          
          return uri;
        };
      } else {
        uriConstructor = function(tile) {
          var subdomain = null;

          if (getSubdomain) {
            subdomain = getSubdomain();
          }

          return constructor(tile.x, tile.y, tile.levelOfDetail, options.url ? options.url : null, subdomain);
        };
      }

      return new Microsoft.Maps.TileLayer({
        mercator: new Microsoft.Maps.TileSource({
          uriConstructor: uriConstructor
        }),
        opacity: options.opacity || 1
      });
    },
    /**
     * Gets a latLng from a click event object.
     * @param {Object} e
     * @return {Object}
     */
    eventGetLatLng: function(e) {
      var x = e.pageX || e.clientX,
          y = e.pageY || e.clientY;

      return this.pixelToLatLng(new Microsoft.Maps.Point(x, y), Microsoft.Maps.PixelReference.page);
    },
    /**
     * Gets a shape from a click event object.
     * @param {Object} e
     * @return {Object}
     */
    eventGetShape: function(e) {
      return e.target;
    },
    /**
     * Gets the current bounds of the map.
     * @return {Object}
     */
    getBounds: function() {
      return map.getBounds();
    },
    /**
     * Gets the center {Microsoft.Maps.Location} of the map.
     * @return {Microsoft.Maps.Location}
     */
    getCenter: function() {
      return map.getCenter();
    },
    /**
     * Gets the latLng (Microsoft.Maps.Location) of the npmap-clickdot div element.
     * @return {Microsoft.Maps.Location}
     */
    getClickDotLatLng: function() {
      return this.pixelToLatLng(this.getClickDotPixel());
    },
    /**
     * Returns the {Microsoft.Mas.Point} for the npmap-clickdot div.
     */
    getClickDotPixel: function() {
      var offset = Util.getOffset(document.getElementById('npmap-map')),
          position = Util.getOffset(document.getElementById('npmap-clickdot'));

      return new Microsoft.Maps.Point(position.left - offset.left, position.top - offset.top);
    },
    /**
     * Gets the map element.
     * @return {Object}
     */
    getMapElement: function() {
      return map.getRootElement();
    },
    /**
     * Gets the anchor of a marker.
     * @param {Microsoft.Maps.Pushpin} (Required) The Pushpin to get the anchor for.
     * @return {Object} An object with x and y properties.
     */
    getMarkerAnchor: function(marker) {
      var anchor = marker.getAnchor();

      return {
        x: anchor.x,
        y: anchor.y
      };
    },
    /**
     * Gets the icon for a marker.
     */
    getMarkerIcon: function(marker) {
      return marker.getIcon();
    },
    /**
     * Gets the latLng (Microsoft.Maps.Location) of the marker.
     * @param {Object} marker The marker to get the latLng for.
     * @return {Object}
     */
    getMarkerLatLng: function(marker) {
      return marker.getLocation();
    },
    /**
     * Gets a marker option.
     * @param {Object} marker The marker object.
     * @param {String} option The option to get. Currently the valid options are: 'icon'.
     */
    getMarkerOption: function(marker, option) {
      if (option === 'icon') {
        return marker.getIcon();
      } else {
        return null;
      }
    },
    /**
     * Gets the visibility property of a marker.
     * @param {Object} marker The marker to check the visibility for.
     */
    getMarkerVisibility: function(marker) {
      return marker.getVisible();
    },
    /**
     * Gets the maximum zoom level for this map.
     * @return {Number}
     */
    getMaxZoom: function() {
      return max;
    },
    /**
     * Gets the minimum zoom level for this map.
     * @return {Number}
     */
    getMinZoom: function() {
      return min;
    },
    /**
     * Gets the zoom level of the map.
     * @return {Float}
     */
    getZoom: function() {
      return Math.round(map.getZoom());
    },
    /**
     * Handles any necessary sizing and positioning for the map when its div is resized.
     */
    handleResize: function() {
      var dimensions = Util.getOuterDimensions(document.getElementById(NPMap.config.div));

      map.setOptions({
        height: dimensions.height,
        width: dimensions.width
      });
    },
    /**
     * Hides a shape.
     * @param {Microsoft.Maps.Pushpin} or {Microsoft.Maps.Polygon} or {Microsoft.Maps.Polyline} shape The shape to hide.
     */
    hideShape: function(shape) {
      if (shape.getVisible() === true) {
        shape.setOptions({
          visible: false
        });
      }
    },
    /**
     *
     */
    hideTileLayer: function(config) {
      map.entities.get(map.entities.indexOf(config.api)).setOptions({
        visible: false
      });
    },
    /**
     * Tests to see if a marker is within the map's current bounds.
     * @param latLng {Object/String} {Required} The latitude/longitude, either a Microsoft.Maps.Location object or a string in "latitude,longitude" format, to test.
     * @return {Boolean}
     */
    isLatLngWithinMapBounds: function(latLng) {
      if (typeof(latLng) === 'string') {
        latLng = NPMap.bing.map.latLngToApi(latLng);
      }
      
      return map.getBounds().contains(latLng);
    },
    /**
     * Converts a Bing Maps Location object to the NPMap representation of a latitude/longitude string.
     * @param latLng {Microsoft.Maps.Location} The Location object to convert to a string.
     * @return {String} A latitude/longitude string in "latitude,longitude" format.
     */
    latLngFromApi: function(latLng) {
      return {
        lat: latLng.latitude,
        lng: latLng.longitude
      };
    },
    /**
     * Converts a NPMap latLng object to a {Microsoft.Maps.Location} object.
     * @param {String/Object} latLng
     * @return {Object}
     */
    latLngToApi: function(latLng) {
      return new Microsoft.Maps.Location(parseFloat(latLng.lat), parseFloat(latLng.lng));
    },
    /**
     * Converts a {Microsoft.Maps.Location} to a {Microsoft.Maps.Point}.
     * @param {Microsoft.Maps.Location} pixel
     * @param {Microsoft.Maps.PixelReference} reference (Optional)
     * @return {Microsoft.Maps.Point}
     */
    latLngToPixel: function(latLng, reference) {
      reference = reference || Microsoft.Maps.PixelReference.viewport;

      return map.tryLocationToPixel(latLng, reference);
    },
    /**
     * Iterates through the default base layers and returns a match if it exists.
     * @param {Object} baseLayer The baseLayer object.
     * @return {Object}
     */
    matchBaseLayer: function(baseLayer) {
      for (var i = 0; i < DEFAULT_BASE_LAYERS.length; i++) {
        if (DEFAULT_BASE_LAYERS[i].code === baseLayer.code) {
          return DEFAULT_BASE_LAYERS[i];
        }
      }
      
      return null;
    },
    /**
     * Pans the map horizontally and vertically based on the pixels passed in.
     * @param {Object} pixels
     * @param {Function} callback (Optional)
     */
    panByPixels: function(pixels, callback) {
      map.setView({
        animate: !callback,
        center: map.getCenter(),
        centerOffset: new Microsoft.Maps.Point(pixels.x, pixels.y)
      });

      if (callback) {
        callback();
      }
    },
    /**
     *
     */
    pixelFromApi: function(pixel) {
      return {
        x: pixel.x,
        y: pixel.y
      };
    },
    /**
     *
     */
    pixelToApi: function(pixel) {
      return new Microsoft.Maps.Point(pixel.x, pixel.y);
    },
    /**
     * Converts a {Microsoft.Maps.Point} to a {Microsoft.Maps.Location}.
     * @param {Microsoft.Maps.Point} pixel
     * @param {Microsoft.Maps.PixelReference} reference (Optional)
     * @return {Microsoft.Maps.Location}
     */
    pixelToLatLng: function(pixel, reference) {
      reference = reference || Microsoft.Maps.PixelReference.control;

      return map.tryPixelToLocation(pixel, reference);
    },
    /**
     * Positions the npmap-clickdot div on top of the pushpin, lat/lng object, or lat/lng string that is passed in.
     * @param {Microsoft.Maps.Pushpin} OR {Microsoft.Maps.Location} OR {String} to The Pushpin, Location, or latitude/longitude string to position the div onto.
     */
    positionClickDot: function(to) {
      var anchorY = 0,
          divClickDot = document.getElementById('npmap-clickdot'),
          me = this,
          pixel = this.latLngToPixel((function() {
            var latLng = null;

            if (to.lat) {
              latLng = new Microsoft.Maps.Location(to.lat, to.lng);
            } else if (to.latitude) {
              latLng = to;
            } else {
              anchorY = me.getMarkerAnchor(to).y;
              latLng = to.getLocation();
            }

            return latLng;
          })(), Microsoft.Maps.PixelReference.control);

      divClickDot.style.left = pixel.x + 'px';
      divClickDot.style.top = pixel.y - anchorY + 'px';
    },
    // TODO: Not implemented yet, as this is handled by Layer.ArcGisServerRest. Will be needed when you handle another layer type.
    reloadTileLayer: function(config) {

    },
    /**
     * Removes a shape from the map.
     * @param {Object} shape
     */
    removeShape: function(shape) {
      map.entities.removeAt(map.entities.indexOf(shape));
    },
    /**
     *
     */
    removeTileLayer: function(config) {
      map.entities.removeAt(map.entities.indexOf(config.api));
    },
    /**
     * Sets the map's baseLayer.
     * @param baseLayer An object with code, name, and visible properties.
     */
    setBaseLayer: function(baseLayer) {
      
    },
    /**
     * DEPRECATED: Sets the marker's icon.
     * @param {Object} marker
     * @param {String} The url of the marker icon.
     */
    setMarkerIcon: function(marker, url) {
      if (typeof(url) === 'function') {
        url = url(marker);
      }

      marker.setOptions({
        icon: url
      });
    },
    /**
     * Sets a marker's options.
     * @param {Microsoft.Maps.Pushpin} marker
     * @param {Object} options The options to set. Currently the valid options are: 'class', 'icon', 'label', 'visible', and 'zIndex'.
     */
    setMarkerOptions: function(marker, options) {
      var valid = {};

      _.each(options, function(v, i) {
        switch (i) {
          case 'class':
            valid.typeName = v;
            break;
          case 'icon':
            valid.icon = v;
            break;
          case 'label':
            valid.text = v;
            break;
          case 'visible':
            valid.visible = v;
            break;
          case 'zIndex':
            valid.zIndex = v;
            break;
        }
      });

      marker.setOptions(valid);
    },
    /**
     * Shows a shape.
     * @param {Microsoft.Maps.Pushpin} or {Microsoft.Maps.Polygon} or {Microsoft.Maps.Polyline} shape The shape to show.
     */
    showShape: function(shape) {
      if (shape.getVisible() === false) {
        shape.setOptions({
          visible: true
        });
      }
    },
    /**
     *
     */
    showTileLayer: function(config) {
      map.entities.get(map.entities.indexOf(config.api)).setOptions({
        visible: true
      });
    },
    /**
     * Switches the base map.
     * @param {Object} type The base layer to switch to. Currently only the default Bing Maps base maps are supported here.
     */
    switchBaseLayer: function(baseLayer) {
      var mapTypeId = null;
      
      switch (baseLayer.code) {
        case 'aerial':
          mapTypeId = Microsoft.Maps.MapTypeId.birdseye;
          break;
        case 'auto':
          mapTypeId = Microsoft.Maps.MapTypeId.auto;
          break;
        case 'birdseye':
          mapTypeId = Microsoft.Maps.MapTypeId.birdseye;
          break;
        case 'mercator':
          mapTypeId = Microsoft.Maps.MapTypeId.mercator;
          break;
        case 'road':
          mapTypeId = Microsoft.Maps.MapTypeId.road;
          break;
        default:
          mapTypeId = Microsoft.Maps.MapTypeId.mercator;
          // TODO: Now need to load tiled layer.
          break;
      }
      
      map.setMapType(mapTypeId);
    },
    /**
     * Zooms the map to a bounding box.
     * @param {Object} bbox A bbox object with nw and se {Microsoft.Maps.Location} objects.
     */
    toBounds: function(bounds) {
      map.setView({
        bounds: bounds,
        padding: 30
      });
    },
    /**
     * Zooms and/or pans the map to its initial extent.
     */
    toInitialExtent: function() {
      NPMap.InfoBox.hide();
      map.setView({
        center: initialCenter,
        zoom: initialZoom
      });
    },
    /**
     * Zooms the map to the extent of an array of lat/lng objects.
     * @param {Array} latLngs The array of lat/lng objects.
     * @return null
     */
    toLatLngs: function(latLngs) {
      this.toBounds(Microsoft.Maps.LocationRect.fromLocations(latLngs));
    },
    /**
     * Zooms the map to the extent of an array of {Microsoft.Map.Pushpin} objects.
     * @param {Array} markers The array of marker objects.
     */
    toMarkers: function(markers) {
      var latLngs = [],
          me = this;

      for (var i = 0; i < markers.length; i++) {
        latLngs.push(me.getMarkerLatLng(markers[i]));
      }

      this.toLatLngs(latLngs);
    },
    /**
     * Triggers an event using the Microsoft.Maps.Events class.
     * @param {String} target Currently the only valid target is 'map'.
     * @return null
     */
    triggerEvent: function(target, name, e) {
      if (target === 'map') {
        e.targetType = 'map';
        target = map;
      }
      
      Microsoft.Maps.Events.invoke(target, name, e);
    },
    /**
     * Zooms the map to a zoom level.
     * @param {Number} zoom
     */
    zoom: function(zoom) {
      map.setView({
        zoom: zoom
      });
    },
    /**
     * Zooms the map in by one zoom level.
     * @param toDot {Boolean} (Optional) If true, center and zoom will be called. Center is based on the location of the npmap-clickdot div.
     */
    zoomIn: function(toDot) {
      var zoom = map.getZoom();
      
      if (toDot) {
        var position = Util.getOffset(document.getElementById('npmap-clickdot')),
            latLng = this.pixelToLatLng(new Microsoft.Maps.Point(position.left, position.top), Microsoft.Maps.PixelReference.viewport);

        map.setView({
          center: latLng,
          zoom: zoom + 1
        });
      } else {
        map.setView({
          zoom: zoom + 1
        });
      }
    },
    /**
     * Zooms the map out by one zoom level.
     */
    zoomOut: function() {
      map.setView({
        zoom: map.getZoom() - 1
      });
    }
  };
});