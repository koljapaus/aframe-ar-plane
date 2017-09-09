// On the example polygon geometry, it looks right.
// On the actual planes/polygons, we only get proper spacing in one dimension.
// Probably because texture is mapped to x and y, not x and z.
AFRAME.registerShader('grid', {
  schema: { 
    color: {type: 'color', is: 'uniform', default: 'white'},
    opacity: {type: 'number', is: 'uniform', default: 1.0},
    thickness: {type: 'number', is: 'uniform', default: 1.0},
    interval: {type: 'number', is: 'uniform', default: 0.01}
  },

  raw: true,

  vertexShader: [
    'precision mediump float;',
    'attribute vec2 uv;',
    'attribute vec3 position;',
    'uniform mat4 projectionMatrix;',
    'uniform mat4 modelViewMatrix;',
    'uniform float interval;',
    'varying vec2 coord;',
    'void main(void) {',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '  coord = vec2(position.x / interval, position.y / interval);',
    '}'
  ].join('\n'),

  fragmentShader: [
    '#extension GL_OES_standard_derivatives: enable',
    'precision mediump float;',
    'uniform vec3 color;',
    'uniform float opacity;',
    'uniform float thickness;',
    'varying vec2 coord;',
    'void main() {',
    '  vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);',
    '  float line = min(grid.x, grid.y);',
    '  if (line > thickness) { discard; } else',
    '  gl_FragColor = vec4(color, opacity);',
    '}'
  ].join('\n')
});
