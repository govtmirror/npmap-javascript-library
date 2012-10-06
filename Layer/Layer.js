/**
 * @class NPMap.Layer
 * @event 'added'
 * @event 'beforeadd'
 * @event 'beforeremove'
 * @event 'removed'
 */
define([
  'Event',
  'Map/Map'
], function(Event, Map) {
  var
      // Information about all of NPMap's layer handlers.
      LAYER_HANDLERS = {
        ArcGisServerRest: {
          clickable: true,
          type: 'raster'
        },
        CartoDb: {
          clickable: true,
          type: 'vector'
        },
        GeoJson: {
          clickable: true,
          type: 'vector'
        },
        GoogleFusion: {
          clickable: true,
          type: 'vector'
        },
        Json: {
          clickable: true,
          type: 'vector'
        },
        Kml: {
          clickable: true,
          type: 'vector'
        },
        NativeVectors: {
          clickable: true,
          type: 'vector'
        },
        Tiled: {
          clickable: true,
          type: 'raster'
        },
        TileStream: {
          clickable: true,
          type: 'vector'
        },
        Xml: {
          clickable: true,
          type: 'vector'
        },
        Zoomify: {
          clickable: false,
          type: 'raster'
        }
      },
      // The layer names that have already been added to the map.
      usedNames = [];

  Event.add('NPMap.Map', 'click', function(e) {
    if (NPMap.config.layers && NPMap.config.layers.length > 0) {
      for (var i = 0; i < NPMap.config.layers.length; i++) {
        var layerType = NPMap.config.layers[i].type,
            meta = LAYER_HANDLERS[layerType];

        if (meta.type === 'raster' && meta.clickable === true) {
          NPMap.Layer[layerType]._handleClick(e);
        }
      }
    }
  });
  Event.add('NPMap.Map', 'shapeclick', function(e) {
    if (NPMap.config.layers && NPMap.config.layers.length > 0) {
      for (var j = 0; j < NPMap.config.layers.length; j++) {
        var layerType = NPMap.config.layers[j].type,
            meta = LAYER_HANDLERS[layerType];
            
        if (meta.type === 'vector' && meta.clickable === true) {
          NPMap.Layer[layerType]._handleClick(e);
        }
      }
    }
  });
  
  return NPMap.Layer = {
    // Events that have been added to this class.
    _events: [{
      event: 'added',
      func: function(config) {
        usedNames.push(config.name);
        NPMap.Map.updateAttribution();
      }
    },{
      event: 'beforeadd',
      func: function(config) {
        if (!config.name) {
          config.name = 'Layer_' + new Date().getTime();

          if (_.indexOf(usedNames, config.name) !== -1) {
            var random = Math.floor(Math.random() * (999999999 - 0 + 1)) + 0;

            config.name = config.name + random;
          }
        }

        if (_.indexOf(usedNames, config.name) === -1) {
          usedNames.push(config.name);
        } else {
          throw new Error('All layer names must be unique. "' + config.name + '" is used more than once.');
        }

        if (!config.type) {
          throw new Error('All layers must have a "type".');
        }

        var meta = LAYER_HANDLERS[config.type];
        
        if (meta.type === 'vector') {
          var lineStyle = {};
              markerStyle = {
                anchor: {
                  x: 6.5,
                  y: 0
                },
                height: 13,
                url: NPMap.config.server + '/resources/img/markers/brown-circle-13x13.png',
                width: 13
              },
              polygonStyle = {
                fillColor: '5e7630',
                fillOpacity: 174,
                strokeColor: '5e7630',
                strokeOpacity: 200,
                strokeWidth: 1
              },
              style = config.style;

          if (style) {
            if (style.line) {

            }

            if (style.marker && style.marker.url) {
              if (style.marker.height && style.marker.width) {
                if (!style.marker.anchor) {
                  style.marker.anchor = {
                    x: style.marker.width / 2,
                    y: 0
                  };
                }

                markerStyle = style.marker;
              } else {
                // TODO: You need to load the image and calculate the height, width, and anchor here.
              }
            }

            if (style.polygon) {
              polygonStyle = config.style.polygon;
            }
          } else {
            config.style = {};
          }

          config.style.line = NPMap.Map[NPMap.config.api].convertLineOptions(lineStyle);
          config.style.marker = NPMap.Map[NPMap.config.api].convertMarkerOptions(markerStyle);
          config.style.polygon = NPMap.Map[NPMap.config.api].convertPolygonOptions(polygonStyle);
        }
      }
    },{
      event: 'removed',
      func: function(config) {
        usedNames.splice(_.indexOf(usedNames, config.name), 1);
        NPMap.Map.updateAttribution();
      }
    }],
    /**
     * Gets the active layer types for both the baseLayers and layers configs.
     * @return {Array}
     */
    getActiveLayerTypes: function() {
      var types = [];
      
      this.iterateThroughAllLayers(function(l) {
        var type = l.type,
            visible = l.visible;

        if ((typeof visible === 'undefined' || visible === true) && _.indexOf(types, type) === -1) {
          types.push(type);
        }
      });

      return types;
    },
    /**
     * Gets a layer config object by layer id.
     * @param {String} id The id of the layer to search for.
     * @param {Array} layers (Optional) The array of layers to search. If this is undefined or null, the NPMap.config.layers array will be searched.
     * @return {Object}
     */
    getLayerById: function(id, layers) {
      if (!layers) {
        layers = NPMap.config.layers;
      }

      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];

        if (layer.id === id) {
          return layer;
        }
      }
    },
    /**
     * Gets a layer config object by layer name.
     * @param {String} name The name of the layer to search for.
     * @param {Array} layers (Optional) The array of layers to search. If this is undefined or null, the NPMap.config.layers array will be searched.
     * @return {Object}
     */
    getLayerByName: function(name, layers) {
      if (!layers) {
        layers = NPMap.config.layers;
      }

      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];

        if (layer.name === name) {
          return layer;
        }
      }
    },
    /**
     * Gets the layer name.
     * @param {Object} config
     */
    getName: function(config) {
      return config.name;
    },
    /**
     * Gets the layer type.
     * @param {Object} config
     */
    getType: function(config) {
      return config.type;
    },
    /**
     * Gets the layers that are currently visible.
     * @return {Array}
     */
    getVisibleLayers: function() {
      var layers = [];

      this.iterateThroughAllLayers(function(l) {
        if (l.visible) {
          layers.push(l);
        }
      });
      
      return layers;
    },
    /**
     * Iterates through all the objects in the NPMap.config.baseLayers and NPMap.config.layers configs.
     * @param {Function} func
     * @return null
     */
    iterateThroughAllLayers: function(func) {
      this.iterateThroughBaseLayers(func);
      this.iterateThroughLayers(func);
    },
    /**
     * Iterates through all the objects in the NPMap.config.baseLayers config.
     * @param {Function} func
     * @return null
     */
    iterateThroughBaseLayers: function(func) {
      if (NPMap.config.baseLayers) {
        _.each(NPMap.config.baseLayers, func);
      }
    },
    /**
     * Iterates through all the objects in the NPMap.config.layers config.
     * @param {Function} func
     * @return null
     */
    iterateThroughLayers: function(func) {
      if (NPMap.config.layers) {
        _.each(NPMap.config.layers, func);
      }
    }
  };
});