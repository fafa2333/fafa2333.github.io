var e=Object.freeze({PAPER:`#f7f7f4`,DATA_PATH:`/models/bit-pointcloud-v5/`,POINT_SIZE:.09,POINT_COUNT:1e5,SPARSE_POINT_COUNT:57141,FULL_POINT_COUNT:228564,LIGHT_POINT_COUNT:114282,DEFAULT_QUALITY:`balanced`,POINT_VARIANTS:Object.freeze({balanced:Object.freeze({file:`points-balanced.bin`,count:1e5,radiusGain:1.3}),sparse:Object.freeze({file:`points-sparse.bin`,count:57141,radiusGain:1.8}),light:Object.freeze({file:`points-light.bin`,count:114282,radiusGain:1.1}),full:Object.freeze({file:`points.bin`,count:228564,radiusGain:1})}),SCATTER_DISTANCE:12,SCATTER_NOISE:1.2,SCAN_DURATION:1.8,AGGREGATE_DURATION:3.2,SCAN_DIRECTION:`left-to-right`,SCAN_WINDOW:.22,ROTATION_SPEED:.0055,ROTATION_INERTIA:.055,MAX_VERTICAL_ROTATION:Object.freeze([-25,30]),MAX_PIXEL_RATIO:1.75,CAMERA_FOV:35,CAMERA_DIRECTION:Object.freeze([1,.68,-1]),CAMERA_MARGIN:1.17,DEPTH_INSET:.13,DRIFT_FPS:30}),t=Object.freeze({CAMERA_DISTANCE:160,TARGET_COVERAGE:.7,MODELS:Object.freeze({bit:Object.freeze({scaleMultiplier:1}),hive:Object.freeze({scaleMultiplier:1})})});function n(e,t,n){if(e.byteLength<16)throw Error(`点云文件头不完整`);let r=new DataView(e),i=r.getUint32(8,!0);if(r.getUint32(0,!0)!==t||r.getUint32(4,!0)!==1||r.getUint32(12,!0)!==n||!i||e.byteLength!==16+i*n*4)throw Error(`点云数据格式不匹配`);let a=new Float32Array(e,16);for(let e of a)if(!Number.isFinite(e))throw Error(`点云坐标无效`);return{count:i,stride:n,data:a}}function r(e){let t=e+2654435769>>>0;return t=Math.imul(t^t>>>16,569420461),t=Math.imul(t^t>>>15,1935289751),((t^t>>>15)>>>0)/4294967296}function i(e,t,n){let i=Math.hypot(...e)||1,a=n*(.3+r(t)*.35);return e.map((e,o)=>e+e/i*a+(r(t+o*101+7)*2-1)*n*.45)}var a=class{constructor(e,t=e){this.duration=e,this.aggregateDuration=t,this.state=`assembled`,this.mode=1,this.progress=0}get running(){return this.state===`scattering`||this.state===`assembling`}get label(){return this.state===`assembled`||this.state===`scattering`?`散开`:`聚合`}start(e=!1){return!this.running&&(this.mode=this.state===`assembled`?1:-1,this.state=this.mode===1?`scattering`:`assembling`,this.progress=0,e&&this.advance(this.mode===1?this.duration:this.aggregateDuration),!0)}advance(e){this.running&&(this.progress=Math.min(1,this.progress+e/(this.mode===1?this.duration:this.aggregateDuration)),this.progress>=1&&(this.state=this.mode===1?`scattered`:`assembled`))}};function o(e,t){return Math.max(t[0]*Math.PI/180,Math.min(t[1]*Math.PI/180,e))}var s=`
uniform float uProgress;
uniform float uMode;
uniform vec2 uScanBounds;
uniform float uScanWindow;
uniform float uScanSign;
float scatterAmount(float screenX, vec3 original) {
  float scan = clamp((screenX - uScanBounds.x) /
    max(.001, uScanBounds.y - uScanBounds.x), 0., 1.);
  if (uScanSign < 0.) scan = 1. - scan;
  float ordered = uMode > 0. ? scan : 1. - scan;
  float jitter = sin(dot(original, vec3(.037, .13, .041))) * .014;
  float start = clamp(ordered * (1. - uScanWindow) + jitter, 0., 1. - uScanWindow);
  float t = smoothstep(start, start + uScanWindow, uProgress);
  return uMode > 0. ? t : 1. - t;
}
`,c=`
${s}
attribute vec3 aOriginalPosition;
attribute vec3 aScatterPosition;
attribute vec3 aRandom;
attribute vec3 aNormal;
attribute vec3 aInk;
attribute float aRadius;
uniform float uTime;
uniform float uNoise;
uniform float uPointScale;
uniform float uViewportHeight;
varying vec3 vInk;
void main() {
  vec4 originalClip = projectionMatrix * modelViewMatrix * vec4(aOriginalPosition, 1.);
  float amount = scatterAmount(originalClip.x / originalClip.w, aOriginalPosition);
  vec3 drift = sin(aRandom * 6.283185 + vec3(.43, .37, .31) * uTime) * uNoise * .12;
  // No drift at rest: amount=0 recovers originalPosition exactly.
  vec3 transformed = mix(aOriginalPosition, aScatterPosition, amount) + drift * amount;
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = clamp(2. * aRadius * uPointScale * uViewportHeight *
    projectionMatrix[1][1] / max(.01, -mvPosition.z) * .5, 1., 32.);
  // In assembled regions, prevent rear-facing returns from thickening the cloud.
  vec3 viewNormal = normalize(normalMatrix * aNormal);
  if (amount < .001 && dot(viewNormal, normalize(-mvPosition.xyz)) < -.05) {
    gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.;
  }
  vInk = aInk;
}
`,l=`
varying vec3 vInk;
void main() {
  float radius = length(gl_PointCoord - .5) * 2.;
  if (radius > 1.) discard;
  float edge = clamp(fwidth(radius), .04, .18);
  float coverage = 1. - smoothstep(1. - edge, 1., radius);
  gl_FragColor = vec4(vInk, coverage);
  #include <colorspace_fragment>
}
`,u=`
uniform float uInset;
varying vec3 vOriginal;
void main() {
  vOriginal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position - normal * uInset, 1.);
}
`,d=`
${s}
varying vec3 vOriginal;
uniform float uViewportWidth;
void main() {
  // Occlude intact regions only. Scattered regions are transparent in depth.
  float screenX = gl_FragCoord.x / uViewportWidth * 2. - 1.;
  if (scatterAmount(screenX, vOriginal) > .0001) discard;
  gl_FragColor = vec4(0.);
}
`;export{s as a,n as c,t as d,e as f,c as i,r as l,u as n,a as o,l as r,o as s,d as t,i as u};