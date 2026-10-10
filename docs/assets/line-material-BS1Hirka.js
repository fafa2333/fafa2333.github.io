import{Bt as e,Ct as t,Dt as n,Ft as r,G as i,It as a,J as o,K as s,Lt as c,N as l,O as u,Pt as d,T as f,n as p,q as m,r as h,s as g,v as _,w as v}from"./three.module-BzrIM94C.js";var y=new g,b=new a,x=class extends v{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new _([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new _([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new f(t,6,1);return this.setAttribute(`instanceStart`,new u(n,3,0)),this.setAttribute(`instanceEnd`,new u(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new f(t,6,1);return this.setAttribute(`instanceColorStart`,new u(n,3,0)),this.setAttribute(`instanceColorEnd`,new u(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(t){return this.fromWireframeGeometry(new e(t.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new g);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),y.setFromBufferAttribute(t),this.boundingBox.union(y))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new n),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)b.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(b)),b.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(b));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}};h.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new r},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},p.line={uniforms:d.merge([h.common,h.fog,h.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var S=class extends t{constructor(e){super({type:`LineMaterial`,uniforms:d.clone(p.line.uniforms),vertexShader:p.line.vertexShader,fragmentShader:p.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return`WORLD_UNITS`in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return`USE_DASH`in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return`USE_ALPHA_TO_COVERAGE`in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE=``:delete this.defines.USE_ALPHA_TO_COVERAGE)}},C=new c,w=new a,T=new a,E=new c,D=new c,O=new c,k=new a,A=new s,j=new l,M=new a,N=new g,P=new n,F=new c,I,L;function R(e,t,n){return F.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),F.multiplyScalar(1/F.w),F.x=L/n.width,F.y=L/n.height,F.applyMatrix4(e.projectionMatrixInverse),F.multiplyScalar(1/F.w),Math.abs(Math.max(F.x,F.y))}function z(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,o=r.attributes.instanceEnd,s=Math.min(r.instanceCount,i.count);for(let r=0,c=s;r<c;r++){j.start.fromBufferAttribute(i,r),j.end.fromBufferAttribute(o,r),j.applyMatrix4(n);let s=new a,c=new a;I.distanceSqToSegment(j.start,j.end,c,s),c.distanceTo(s)<L*.5&&t.push({point:c,pointOnLine:s,distance:I.origin.distanceTo(c),object:e,face:null,faceIndex:r,uv:null,uv1:null})}}function B(e,t,n){let r=t.projectionMatrix,o=e.material.resolution,s=e.matrixWorld,c=e.geometry,l=c.attributes.instanceStart,u=c.attributes.instanceEnd,d=Math.min(c.instanceCount,l.count),f=-t.near;I.at(1,O),O.w=1,O.applyMatrix4(t.matrixWorldInverse),O.applyMatrix4(r),O.multiplyScalar(1/O.w),O.x*=o.x/2,O.y*=o.y/2,O.z=0,k.copy(O),A.multiplyMatrices(t.matrixWorldInverse,s);for(let t=0,c=d;t<c;t++){if(E.fromBufferAttribute(l,t),D.fromBufferAttribute(u,t),E.w=1,D.w=1,E.applyMatrix4(A),D.applyMatrix4(A),E.z>f&&D.z>f)continue;if(E.z>f){let e=E.z-D.z,t=(E.z-f)/e;E.lerp(D,t)}else if(D.z>f){let e=D.z-E.z,t=(D.z-f)/e;D.lerp(E,t)}E.applyMatrix4(r),D.applyMatrix4(r),E.multiplyScalar(1/E.w),D.multiplyScalar(1/D.w),E.x*=o.x/2,E.y*=o.y/2,D.x*=o.x/2,D.y*=o.y/2,j.start.copy(E),j.start.z=0,j.end.copy(D),j.end.z=0;let c=j.closestPointToPointParameter(k,!0);j.at(c,M);let d=i.lerp(E.z,D.z,c),p=d>=-1&&d<=1,m=k.distanceTo(M)<L*.5;if(p&&m){j.start.fromBufferAttribute(l,t),j.end.fromBufferAttribute(u,t),j.start.applyMatrix4(s),j.end.applyMatrix4(s);let r=new a,i=new a;I.distanceSqToSegment(j.start,j.end,i,r),n.push({point:i,pointOnLine:r,distance:I.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}var V=class extends m{constructor(e=new x,t=new S({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)w.fromBufferAttribute(t,e),T.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+w.distanceTo(T);let i=new f(r,2,1);return e.setAttribute(`instanceDistanceStart`,new u(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new u(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;if(r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;I=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;L=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),P.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?L*.5:R(r,Math.max(r.near,P.distanceToPoint(I.origin)),s.resolution),P.radius+=c,I.intersectsSphere(P)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),N.copy(o.boundingBox).applyMatrix4(a);let l;l=n?L*.5:R(r,Math.max(r.near,N.distanceToPoint(I.origin)),s.resolution),N.expandByScalar(l),I.intersectsBox(N)!==!1&&(n?z(this,t):B(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(C),this.material.uniforms.resolution.value.set(C.z,C.w))}},H=Object.freeze({cameraElevationDegrees:28,autoDegreesPerSecond:3,initialDegrees:{bit:15,hive:-20},radiansPerPixel:.0055,resumeTimeConstant:.12,maxReleaseRadiansPerSecond:1.4,staleReleaseMs:80,touchThresholdPixels:6}),U=Object.freeze({color:`#828c7e`,widthCSS:.8,maxDPR:2,creaseAngleDegrees:28,cameraDirection:[1,Math.SQRT2*Math.tan(H.cameraElevationDegrees*Math.PI/180),-1],cameraDistance:160,fov:35,targetCoverage:.7,models:{bit:{scaleMultiplier:1},hive:{scaleMultiplier:1}}}),W=class{constructor(e){this.yaw=H.initialDegrees[e]*Math.PI/180,this.autoSpeed=H.autoDegreesPerSecond*Math.PI/180,this.velocity=this.autoSpeed,this.dragging=!1}begin(){this.dragging=!0,this.velocity=0}drag(e,t){let n=e*H.radiansPerPixel;this.yaw+=n,this.velocity=Math.max(-H.maxReleaseRadiansPerSecond,Math.min(H.maxReleaseRadiansPerSecond,n/Math.max(.008,t)))}release(e=!0){this.dragging=!1,e||(this.velocity=0)}update(e,t=!1){if(this.dragging)return;if(t){this.velocity=0;return}let n=Math.max(0,e),r=H.resumeTimeConstant,i=this.velocity-this.autoSpeed,a=Math.exp(-n/r);this.yaw+=this.autoSpeed*n+i*r*(1-a),this.velocity=this.autoSpeed+i*a}},G=class{constructor(e,{model:t,ready:n,reduced:r,wake:i}){this.canvas=e,this.ready=n,this.reduced=r,this.wake=i,this.motion=new W(t),this.pointer=null,this.events=new AbortController;let a={signal:this.events.signal};e.addEventListener(`pointerdown`,t=>{n()&&t.button===0&&t.isPrimary&&!this.pointer&&(this.motion.begin(),this.pointer={id:t.pointerId,startX:t.clientX,startY:t.clientY,x:t.clientX,time:t.timeStamp,pending:t.pointerType===`touch`},this.pointer.pending||(e.setPointerCapture(t.pointerId),t.preventDefault()),e.dataset.dragging=`true`,i())},a),e.addEventListener(`pointermove`,t=>{let n=this.pointer;if(n&&n.id===t.pointerId){if(n.pending){let r=Math.abs(t.clientX-n.startX),a=Math.abs(t.clientY-n.startY);if(a>H.touchThresholdPixels&&a>r){this.stop(),i();return}if(r<H.touchThresholdPixels||r<=a)return;n.pending=!1,e.setPointerCapture(t.pointerId)}this.motion.drag(t.clientX-n.x,(t.timeStamp-n.time)/1e3),n.x=t.clientX,n.time=t.timeStamp,t.preventDefault(),i()}},a);let o=t=>{let n=this.pointer;n&&n.id===t.pointerId&&(this.motion.release(!n.pending&&t.type===`pointerup`&&t.timeStamp-n.time<=H.staleReleaseMs&&!r.matches),this.pointer=null,e.dataset.dragging=`false`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),i())};for(let t of[`pointerup`,`pointercancel`,`lostpointercapture`])e.addEventListener(t,o,a);e.addEventListener(`keydown`,e=>{n()&&[`ArrowLeft`,`ArrowRight`].includes(e.key)&&(e.preventDefault(),this.motion.begin(),this.motion.drag(e.key===`ArrowRight`?15:-15,.1),this.motion.release(!1),i())},a)}get yaw(){return this.motion.yaw}get pitch(){return 0}get moving(){return this.ready()&&!this.motion.dragging&&!this.reduced.matches}update(e,t){this.ready()&&this.motion.update(e,this.reduced.matches),t.rotation.set(0,this.motion.yaw,0)}stop(){let e=this.pointer;this.pointer=null,this.motion.release(!1),this.canvas.dataset.dragging=`false`,e&&this.canvas.hasPointerCapture(e.id)&&this.canvas.releasePointerCapture(e.id)}dispose(){this.stop(),this.events.abort()}};function K(e,t,n){if(e.byteLength<16)throw Error(`Incomplete architectural geometry`);let r=new DataView(e),i=r.getUint32(8,!0);if(r.getUint32(0,!0)!==t||r.getUint32(4,!0)!==1||r.getUint32(12,!0)!==n||e.byteLength!==16+i*n*4)throw Error(`Invalid architectural geometry format`);return new Float32Array(e,16,i*n)}async function q(e,t){let n=async(n,r,i)=>{let a=await fetch(`/models/architectural-lines/${e}-${n}.bin`,{signal:t});if(!a.ok)throw Error(`Unable to load ${e} ${n}`);return K(await a.arrayBuffer(),r,i)},[r,i]=await Promise.all([n(`surface`,1464226630,3),n(`lines`,1464224846,13)]);return{surface:r,lines:i}}function J(){let e=new S({color:U.color,linewidth:U.widthCSS,depthTest:!0,depthWrite:!1,transparent:!1,alphaToCoverage:!0});return e.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace(`void main() {`,`
      attribute vec3 faceA;
      attribute vec3 faceB;
      attribute float structural;
      varying float lineVisible;
      void main() {
        vec3 midpoint = (modelViewMatrix * vec4((instanceStart + instanceEnd) * .5, 1.0)).xyz;
        vec3 view = normalize(-midpoint);
        float facingA = dot(normalMatrix * faceA, view);
        float facingB = dot(normalMatrix * faceB, view);
        lineVisible = max(structural, facingA * facingB < 0.0 ? 1.0 : 0.0);
    `),e.fragmentShader=e.fragmentShader.replace(`void main() {`,`
      varying float lineVisible;
      void main() {
        if (lineVisible < .5) discard;
    `)},e.customProgramCacheKey=()=>`architectural-structure-and-silhouette-v1`,e}function Y(){return new o({colorWrite:!1,depthWrite:!0,side:2,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:2})}export{W as a,V as c,G as i,x as l,Y as n,U as o,q as r,H as s,J as t};