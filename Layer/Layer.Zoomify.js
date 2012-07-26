﻿define([
  'Layer/Layer'
], function(Layer) {
  return NPMap.Layer.Zoomify = {
    /**
     * Creates a Zoomify layer.
     ** @param {Object} config.
     */
    create: function(config) {
      NPMap.Event.trigger('NPMap.Layer', 'beforeadd', config);

      if (!config.height) {
        throw new Error('"height" is required.');
      }
      
      if (!config.width) {
        throw new Error('"width" is required.');
      }

      var layer = NPMap.Map.createZoomifyLayer(config);
      
      NPMap.Map.addZoomifyLayer(layer);
      NPMap.Event.trigger('NPMap.Layer', 'added', config);
    }
  };
});