AFRAME.registerComponent('three-ar-planes', {
  dependencies: ['three-ar'],

  init: function () {
    // Remember planes when we see them.
    // Map, so we can enumerate it properly.
    this.planes = new Map();
  },

  tick: (function (t, dt) {
    // Create the temporary variables we will reuse, if needed.
    var tempPosition = new THREE.Vector3();
    var tempQuaternion = new THREE.Quaternion();
    var tempScale = new THREE.Vector3();
    var tempRotation = new THREE.Euler(0, 0, 0, 'YXZ');
    var tempMatrix4 = new THREE.Matrix4();
    var tempExtent = new THREE.Vector3();
    
    // The actual function, which we return.
    return function (t, dt) {
      // Check to see if the anchor list is available.
      var threear = this.el.components['three-ar'];
      if (!threear || !threear.arDisplay) { return; }
      var anchors = threear.arDisplay.anchors_;
      if (!anchors) { return; }

      // Iterate over the available anchors.
      for (var i=0; i<anchors.length; i++) {
        var anchor = anchors[i];
        tempMatrix4.elements = anchor.transform;
        tempMatrix4.decompose(tempPosition, tempQuaternion, tempScale);
        tempRotation.setFromQuaternion(tempQuaternion);
        tempRotation.x *= THREE.Math.RAD2DEG;
        tempRotation.y *= THREE.Math.RAD2DEG;
        tempRotation.z *= THREE.Math.RAD2DEG;
        tempExtent.set(anchor.extent[0], 0, anchor.extent[1]);
        // Check if we've seen this one.
        if (this.planes[anchor.identifier]) {
          // Is it cheaper to treat every time as an update, or to check?
          // DEFINITELY cheaper to check.
          // Unfortunately with current WebARonARKit, brute force is needed.
          if (!AFRAME.utils.deepEqual(anchor, this.planes[anchor.identifier])) {
            // Remember the updated information.
            this.planes[anchor.identifier] = JSON.parse(JSON.stringify(anchor));
            this.planes[anchor.identifier].marked = true;

            // Emit event.
            this.el.emit('updateplane', {
              id: anchor.identifier,
              alignment: anchor.alignment,
              extent: tempExtent,
              position: tempPosition,
              rotation: tempRotation,
              scale: tempScale
            });
          }
        } else {
          // We haven't seen it, so remember it.
          this.planes[anchor.identifier] = JSON.parse(JSON.stringify(anchor));
          this.planes[anchor.identifier].marked = true;

          // Emit event.
          this.el.emit('createplane', {
            id: anchor.identifier,
            alignment: anchor.alignment,
            extent: tempExtent,
            position: tempPosition,
            rotation: tempRotation,
            scale: tempScale
          });
        }
        // TODO:
        // If removed anchors can still appear in the list,
        // handle that here.
      }

      // Iterate over planes we've seen; if they're removed, emit events.
      this.planes.forEach(function(key, value, map) {
        var plane = this.planes[key];
        if (plane.marked) {
          // Clear flag in preparation for next time.
          plane.marked = false;
        } else {
          // Emit event.
          this.el.emit('removeplane', {id: plane.identifier});
          delete this.planes[key];
        }
      });
    };    
  })()
});