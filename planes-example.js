
      var randomColors = ['red', 'orange', /* 'yellow', */ 'green', 'blue', 'violet'];
        
      var raycasterUpdateNeeded = false;
      var raycasterInterval;
      
      function raycasterNeedsUpdate() {
        raycasterUpdateNeeded = true;
        if (!raycasterInterval) {
          // NOTE: Assumes raycaster doesn't change.
          var raycaster = sc.querySelector('[raycaster]').components.raycaster;          
          raycasterInterval = setInterval(function() {
            if (raycasterUpdateNeeded) {
              raycaster.refreshObjects();                      
              raycasterUpdateNeeded = false;
            }
          }, raycaster.interval);
        }
      }
      
      var tempMat4 = new THREE.Matrix4();
      var tempScale = new THREE.Vector3();
      
      function onAddedOrUpdatedPlanes(evt) {
        var sc = AFRAME.scenes[0];
        evt.detail.anchors.forEach(function (anchor) {
          var created = false;
          var colorToUse;
          var plane = sc.querySelector('#plane_' + anchor.identifier);
          if (!plane) {
            // Create and append the plane.
            created = true;
            colorToUse = randomColors[Math.floor(Math.random() * randomColors.length)];
            plane = document.createElement('a-box');
            plane.setAttribute('id', 'plane_' + anchor.identifier);
            plane.setAttribute('class', 'plane');
            plane.setAttribute('height', 0.001);

            plane.setAttribute('material', 'shader:grid;interval:0.1;side:double;opacity:0.5;color:' + colorToUse);

            sc.appendChild(plane);

            plane.insertAdjacentHTML('beforeend',                   
                                     
              // Add a plane label (which needs to be rotated to match a-box).
              '<a-entity class="label" rotation="-90 0 0"></a-entity>' +             
              
              // Add bounding box.
              '<a-box class="bbox" position="0 0 0" height="0" material="wireframe:true;opacity:0.5;color:' + colorToUse + '"></a-box>' +
              // Add a thing to mark the center of the plane.
              '<a-entity thing></a-entity>');

            // Create the temp objects we will use when updating.
            plane.tempPosition = new THREE.Vector3();
            plane.tempQuaternion = new THREE.Quaternion();
            plane.tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
            plane.tempRotation = new THREE.Vector3();            
          } else {
            colorToUse = plane.getAttribute('material', 'color');
          }

          // Update the plane.
          var dx = anchor.extent[0];
          var dz = anchor.extent[1];
          tempMat4.fromArray(anchor.modelMatrix);
          tempMat4.decompose(plane.tempPosition, plane.tempQuaternion, tempScale);
          plane.tempEuler.setFromQuaternion(plane.tempQuaternion);
          plane.tempRotation.set(
            plane.tempEuler.x * THREE.Math.RAD2DEG,
            plane.tempEuler.y * THREE.Math.RAD2DEG,
            plane.tempEuler.z * THREE.Math.RAD2DEG);
          plane.setAttribute('position', plane.tempPosition);
          plane.setAttribute('rotation', plane.tempRotation);
          // Currently, scale is always 1... 
          // plane.setAttribute('scale', evt.detail.scale);

          // If we have vertices, use polygon geometry
          if (anchor.vertices) {
            // anchor.vertices works for latest ARKit but not for latest ARCore; Float32Array issue?
            plane.setAttribute('geometry', {primitive:'polygon', vertices: anchor.vertices.join(',')});
          } else {
            plane.setAttribute('geometry', 'primitive:box; width:' + dx +
                                           '; height:0.001; depth:' + dz);                    
          }

          // Update the bounding box.
          var bbox = plane.querySelector('.bbox');
          bbox.setAttribute('width', dx);
          bbox.setAttribute('depth', dz);
 
          // Fill out the plane label with informative text.
          // DETAIL: when creating, getAttribute doesn't work this tick
          plane.querySelector('.label').setAttribute('text', {
           width: dx, 
           height: dz, 
           color: 'gray',
           align: 'left',
           zOffset: 0.01,
           wrapCount: 100, value: 
            'id: ' + anchor.identifier
          + '\nwidth: ' + dx
          + '\ndepth: ' + dz
          + '\nposition x: ' + plane.tempPosition.x
          + '\nposition y: ' + plane.tempPosition.y
          + '\nposition z: ' + plane.tempPosition.z
          + '\nrotation x: ' + plane.tempRotation.x
          + '\nrotation y: ' + plane.tempRotation.y
          + '\nrotation z: ' + plane.tempRotation.z
          // Currently, scale is always 1... 
          //+ '\nscale x: ' + plane.getAttribute('scale').x
          //+ '\nscale y: ' + plane.getAttribute('scale').y
          //+ '\nscale z: ' + plane.getAttribute('scale').z
          });
       
          // We updated the plane (or added it), so update the raycaster.
          // Because there may be a DOM change, we need to wait a tick.
          if (created) { setTimeout(raycasterNeedsUpdate); } else { raycasterNeedsUpdate(); }
          
          return plane;
        });                  
      }
      
      function onRemovedPlanes(evt) {
        var sc = AFRAME.scenes[0];
        evt.detail.anchors.forEach(function (anchor) {
          var plane = sc.querySelector('#plane_' + anchor.identifier);
          if (plane && plane.parentElement) {
            plane.parentElement.removeChild(plane);
          }          
        });
      }            
      
      function addPlaneListeners() {
        var sc = AFRAME.scenes[0];
        // Listen for plane events that aframe-ar generates.
        sc.addEventListener('anchorsadded', onAddedOrUpdatedPlanes);
        sc.addEventListener('anchorsupdated', onAddedOrUpdatedPlanes);
        sc.addEventListener('anchorsremoved', onRemovedPlanes);
      }
      
      function addARRaycasterListeners() {
        var raycaster = sc.querySelector('[ar-raycaster]');
        // Note, -intersection is what the raycaster gets; the hit object gets -intersected.
        raycaster.addEventListener('raycaster-intersection', function (evt) {
          // Use first hit (which should be nearest).
          var point = evt.detail.intersections[0].point;
          var distance = evt.detail.intersections[0].distance;
          var el = evt.detail.els[0];
          showHUD('raycaster-intersection ' + distance + '\n' + JSON.stringify(point) + '\n' + el.id /*el.outerHTML*/);
          if (el.getAttribute('class') === 'plane') { el.setAttribute('opacity', 1.0); }
          ball.setAttribute('position', point);
          ball.setAttribute('visible', true);
        });
        raycaster.addEventListener('raycaster-intersection-cleared', function (evt) {
          var el = evt.detail.el;
          showHUD('raycaster-intersection-cleared\n' + el.outerHTML);
          if (el.getAttribute('class') === 'plane') { el.setAttribute('opacity', 0.5); }
          ball.setAttribute('visible', false);
        });
      }
      
      function addEventListeners() {
        addARRaycasterListeners();
        addPlaneListeners();
      }      
      
      function onSceneLoaded() { 
        var tempScale = new THREE.Vector3();
        var tempMat4 = new THREE.Matrix4();
        
        window.addEventListener('click', function() {
          // If the cursor has an intersection, place a marker.
          var cursor = sc.querySelector('[ar-raycaster]').components.cursor;
          if (cursor.intersection) {
            var marker = document.createElement('a-box');
            marker.setAttribute('width', 0.01);
            marker.setAttribute('depth', 0.01);
            marker.setAttribute('height', 1);
            marker.setAttribute('color', 'orange');
            marker.setAttribute('position', {
              x: cursor.intersection.point.x, 
              y: cursor.intersection.point.y + 0.5, 
              z: cursor.intersection.point.z});
            sc.appendChild(marker);         
          }
          
          // Show plane info on click.
          // (may not have arDisplay until tick after loaded)
          var ardisplay = sc.components['three-ar'].arDisplay;
          if (!ardisplay) { showHUD('no ardisplay?'); } else {
            // Old versions of WebARonARKit don't expose getPlanes() correctly.
            var planes = ardisplay.getPlanes ? ardisplay.getPlanes() : ardisplay.anchors_;

            var keys = Object.keys(sc.components['three-ar-planes'].planes);
            var msg = planes.length + ' (vs. ' + keys.length + ': ' + keys.join(',') + ')\n\n';
/*           
            planes.forEach(function (plane) {              
              // Write out what we got, for debugging.
              msg += 
              'identifier: ' + plane.identifier + '' + // string, per latest spec
              ' ' + JSON.stringify(plane.vector3) + '' + // unified to THREE.Vector3
              ' ' + JSON.stringify(plane.rotation) + '' + // unified to THREE.Quaternion
              ' ' + plane.extent + '\n' + // number[2], per latest spec
              (plane.vertices ? ('vertices: ' + plane.vertices.length + '\n') : '') + // number[3*n], per latest spec
              '';
            });
*/            
            showHUD(msg);
          }
        });
        
        addEventListeners();
      }
      
      if (sc.hasLoaded) { onSceneLoaded(); }
      else { sc.addEventListener('loaded', onSceneLoaded); }
    </script>
  </body>
</html>