import{Ct as e,E as t,Ft as n,G as r,It as i,J as a,K as o,Lt as s,Nt as c,Pt as l,Q as u,St as d,X as f,Y as p,at as m,b as h,c as g,ct as ee,d as te,g as ne,gt as re,ht as _,i as ie,it as v,lt as y,m as ae,ot as oe,p as b,pt as se,q as x,s as ce,t as le,u as S,v as C,vt as ue,wt as de,x as fe,zt as w}from"./three.module-BzrIM94C.js";import{t as pe}from"./GLTFLoader-00bxrTeG.js";var me=class extends d{constructor(){super(),this.name=`RoomEnvironment`,this.position.y=-3.5;let e=new g;e.deleteAttribute(`uv`);let n=new u({side:1}),r=new u,i=new y(16777215,900,28,2);i.position.set(.418,16.199,.3),this.add(i);let a=new x(e,n);a.position.set(-.757,13.219,.717),a.scale.set(31.713,28.305,28.591),this.add(a);let o=new t(e,r,6),s=new v;s.position.set(-10.906,2.009,1.846),s.rotation.set(0,-.195,0),s.scale.set(2.328,7.905,4.651),s.updateMatrix(),o.setMatrixAt(0,s.matrix),s.position.set(-5.607,-.754,-.758),s.rotation.set(0,.994,0),s.scale.set(1.97,1.534,3.955),s.updateMatrix(),o.setMatrixAt(1,s.matrix),s.position.set(6.167,.857,7.803),s.rotation.set(0,.561,0),s.scale.set(3.927,6.285,3.687),s.updateMatrix(),o.setMatrixAt(2,s.matrix),s.position.set(-2.017,.018,6.124),s.rotation.set(0,.333,0),s.scale.set(2.002,4.566,2.064),s.updateMatrix(),o.setMatrixAt(3,s.matrix),s.position.set(2.291,-.756,-2.621),s.rotation.set(0,-.286,0),s.scale.set(1.546,1.552,1.496),s.updateMatrix(),o.setMatrixAt(4,s.matrix),s.position.set(-2.193,-.369,-5.547),s.rotation.set(0,.516,0),s.scale.set(3.875,3.487,2.986),s.updateMatrix(),o.setMatrixAt(5,s.matrix),this.add(o);let c=new x(e,T(50));c.position.set(-16.116,14.37,8.208),c.scale.set(.1,2.428,2.739),this.add(c);let l=new x(e,T(50));l.position.set(-16.109,18.021,-8.207),l.scale.set(.1,2.425,2.751),this.add(l);let d=new x(e,T(17));d.position.set(14.904,12.198,-1.832),d.scale.set(.15,4.265,6.331),this.add(d);let f=new x(e,T(43));f.position.set(-.462,8.89,14.52),f.scale.set(4.38,5.441,.088),this.add(f);let p=new x(e,T(20));p.position.set(3.235,11.486,-12.541),p.scale.set(2.5,2,.1),this.add(p);let m=new x(e,T(100));m.position.set(0,20,0),m.scale.set(1,.1,1),this.add(m)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function T(e){return new f({color:0,emissive:16777215,emissiveIntensity:e})}var E={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},D=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},he=new m(-1,1,1,-1,0,1),O=new class extends S{constructor(){super(),this.setAttribute(`position`,new C([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new C([0,2,0,0,2,0],2))}},k=class{constructor(e){this._mesh=new x(O,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,he)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},ge=class extends D{constructor(t,n=`tDiffuse`){super(),this.textureID=n,this.uniforms=null,this.material=null,t instanceof e?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=l.clone(t.uniforms),this.material=new e({name:t.name===void 0?`unspecified`:t.name,defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new k(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},A=class extends D{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},j=class extends D{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},_e=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let r=e.getSize(new n);this._width=r.width,this._height=r.height,t=new w(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:h}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ge(E),this.copyPass.material.blending=0,this.timer=new c}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}A!==void 0&&(r instanceof A?n=!0:r instanceof j&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new n);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},ve=class extends D{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new b}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},ye=class t extends D{constructor(t,r,i,a){super(),this.renderScene=r,this.renderCamera=i,this.selectedObjects=a===void 0?[]:a,this.visibleEdgeColor=new b(1,1,1),this.hiddenEdgeColor=new b(.1,.04,.02),this.edgeGlow=0,this.usePatternTexture=!1,this.patternTexture=null,this.edgeThickness=1,this.edgeStrength=3,this.downSampleRatio=2,this.pulsePeriod=0,this._visibilityCache=new Map,this._selectionCache=new Set,this.resolution=t===void 0?new n(256,256):new n(t.x,t.y);let s=Math.round(this.resolution.x/this.downSampleRatio),c=Math.round(this.resolution.y/this.downSampleRatio);this.renderTargetMaskBuffer=new w(this.resolution.x,this.resolution.y),this.renderTargetMaskBuffer.texture.name=`OutlinePass.mask`,this.renderTargetMaskBuffer.texture.generateMipmaps=!1,this.depthMaterial=new p,this.depthMaterial.side=2,this.depthMaterial.depthPacking=_,this.depthMaterial.blending=0,this.prepareMaskMaterial=this._getPrepareMaskMaterial(),this.prepareMaskMaterial.side=2,this.prepareMaskMaterial.fragmentShader=d(this.prepareMaskMaterial.fragmentShader,this.renderCamera),this.renderTargetDepthBuffer=new w(this.resolution.x,this.resolution.y,{type:h}),this.renderTargetDepthBuffer.texture.name=`OutlinePass.depth`,this.renderTargetDepthBuffer.texture.generateMipmaps=!1,this.renderTargetMaskDownSampleBuffer=new w(s,c,{type:h,depthBuffer:!1}),this.renderTargetMaskDownSampleBuffer.texture.name=`OutlinePass.depthDownSample`,this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps=!1,this.renderTargetBlurBuffer1=new w(s,c,{type:h,depthBuffer:!1}),this.renderTargetBlurBuffer1.texture.name=`OutlinePass.blur1`,this.renderTargetBlurBuffer1.texture.generateMipmaps=!1,this.renderTargetBlurBuffer2=new w(Math.round(s/2),Math.round(c/2),{type:h,depthBuffer:!1}),this.renderTargetBlurBuffer2.texture.name=`OutlinePass.blur2`,this.renderTargetBlurBuffer2.texture.generateMipmaps=!1,this.edgeDetectionMaterial=this._getEdgeDetectionMaterial(),this.renderTargetEdgeBuffer1=new w(s,c,{type:h,depthBuffer:!1}),this.renderTargetEdgeBuffer1.texture.name=`OutlinePass.edge1`,this.renderTargetEdgeBuffer1.texture.generateMipmaps=!1,this.renderTargetEdgeBuffer2=new w(Math.round(s/2),Math.round(c/2),{type:h,depthBuffer:!1}),this.renderTargetEdgeBuffer2.texture.name=`OutlinePass.edge2`,this.renderTargetEdgeBuffer2.texture.generateMipmaps=!1,this.separableBlurMaterial1=this._getSeparableBlurMaterial(4),this.separableBlurMaterial1.uniforms.texSize.value.set(s,c),this.separableBlurMaterial1.uniforms.kernelRadius.value=1,this.separableBlurMaterial2=this._getSeparableBlurMaterial(4),this.separableBlurMaterial2.uniforms.texSize.value.set(Math.round(s/2),Math.round(c/2)),this.separableBlurMaterial2.uniforms.kernelRadius.value=4,this.overlayMaterial=this._getOverlayMaterial();let u=E;this.copyUniforms=l.clone(u.uniforms),this.materialCopy=new e({uniforms:this.copyUniforms,vertexShader:u.vertexShader,fragmentShader:u.fragmentShader,blending:0,depthTest:!1,depthWrite:!1}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new b,this.oldClearAlpha=1,this._fsQuad=new k(null),this.tempPulseColor1=new b,this.tempPulseColor2=new b,this.textureMatrix=new o;function d(e,t){let n=t.isPerspectiveCamera?`perspective`:`orthographic`;return e.replace(/DEPTH_TO_VIEW_Z/g,n+`DepthToViewZ`)}}dispose(){this.renderTargetMaskBuffer.dispose(),this.renderTargetDepthBuffer.dispose(),this.renderTargetMaskDownSampleBuffer.dispose(),this.renderTargetBlurBuffer1.dispose(),this.renderTargetBlurBuffer2.dispose(),this.renderTargetEdgeBuffer1.dispose(),this.renderTargetEdgeBuffer2.dispose(),this.depthMaterial.dispose(),this.prepareMaskMaterial.dispose(),this.edgeDetectionMaterial.dispose(),this.separableBlurMaterial1.dispose(),this.separableBlurMaterial2.dispose(),this.overlayMaterial.dispose(),this.materialCopy.dispose(),this._fsQuad.dispose()}setSize(e,t){this.renderTargetMaskBuffer.setSize(e,t),this.renderTargetDepthBuffer.setSize(e,t);let n=Math.round(e/this.downSampleRatio),r=Math.round(t/this.downSampleRatio);this.renderTargetMaskDownSampleBuffer.setSize(n,r),this.renderTargetBlurBuffer1.setSize(n,r),this.renderTargetEdgeBuffer1.setSize(n,r),this.separableBlurMaterial1.uniforms.texSize.value.set(n,r),n=Math.round(n/2),r=Math.round(r/2),this.renderTargetBlurBuffer2.setSize(n,r),this.renderTargetEdgeBuffer2.setSize(n,r),this.separableBlurMaterial2.uniforms.texSize.value.set(n,r)}render(e,n,r,i,a){if(this.selectedObjects.length>0){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();let n=e.autoClear;e.autoClear=!1,a&&e.state.buffers.stencil.setTest(!1),e.setClearColor(16777215,1),this._updateSelectionCache(),this._changeVisibilityOfSelectedObjects(!1);let i=this.renderScene.background,o=this.renderScene.overrideMaterial;if(this.renderScene.background=null,this.renderScene.overrideMaterial=this.depthMaterial,e.setRenderTarget(this.renderTargetDepthBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this._changeVisibilityOfSelectedObjects(!0),this._visibilityCache.clear(),this._updateTextureMatrix(),this._changeVisibilityOfNonSelectedObjects(!1),this.renderScene.overrideMaterial=this.prepareMaskMaterial,this.prepareMaskMaterial.uniforms.cameraNearFar.value.set(this.renderCamera.near,this.renderCamera.far),this.prepareMaskMaterial.uniforms.depthTexture.value=this.renderTargetDepthBuffer.texture,this.prepareMaskMaterial.uniforms.textureMatrix.value=this.textureMatrix,e.setRenderTarget(this.renderTargetMaskBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this._changeVisibilityOfNonSelectedObjects(!0),this._visibilityCache.clear(),this._selectionCache.clear(),this.renderScene.background=i,this.renderScene.overrideMaterial=o,this._fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetMaskBuffer.texture,e.setRenderTarget(this.renderTargetMaskDownSampleBuffer),e.clear(),this._fsQuad.render(e),this.tempPulseColor1.copy(this.visibleEdgeColor),this.tempPulseColor2.copy(this.hiddenEdgeColor),this.pulsePeriod>0){let e=1.25/2+Math.cos(performance.now()*.01/this.pulsePeriod)*.75/2;this.tempPulseColor1.multiplyScalar(e),this.tempPulseColor2.multiplyScalar(e)}this._fsQuad.material=this.edgeDetectionMaterial,this.edgeDetectionMaterial.uniforms.maskTexture.value=this.renderTargetMaskDownSampleBuffer.texture,this.edgeDetectionMaterial.uniforms.texSize.value.set(this.renderTargetMaskDownSampleBuffer.width,this.renderTargetMaskDownSampleBuffer.height),this.edgeDetectionMaterial.uniforms.visibleEdgeColor.value=this.tempPulseColor1,this.edgeDetectionMaterial.uniforms.hiddenEdgeColor.value=this.tempPulseColor2,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.separableBlurMaterial1,this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=t.BlurDirectionX,this.separableBlurMaterial1.uniforms.kernelRadius.value=this.edgeThickness,e.setRenderTarget(this.renderTargetBlurBuffer1),e.clear(),this._fsQuad.render(e),this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetBlurBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=t.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.separableBlurMaterial2,this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial2.uniforms.direction.value=t.BlurDirectionX,e.setRenderTarget(this.renderTargetBlurBuffer2),e.clear(),this._fsQuad.render(e),this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetBlurBuffer2.texture,this.separableBlurMaterial2.uniforms.direction.value=t.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer2),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.overlayMaterial,this.overlayMaterial.uniforms.maskTexture.value=this.renderTargetMaskBuffer.texture,this.overlayMaterial.uniforms.edgeTexture1.value=this.renderTargetEdgeBuffer1.texture,this.overlayMaterial.uniforms.edgeTexture2.value=this.renderTargetEdgeBuffer2.texture,this.overlayMaterial.uniforms.patternTexture.value=this.patternTexture,this.overlayMaterial.uniforms.edgeStrength.value=this.edgeStrength,this.overlayMaterial.uniforms.edgeGlow.value=this.edgeGlow,this.overlayMaterial.uniforms.usePatternTexture.value=this.usePatternTexture,a&&e.state.buffers.stencil.setTest(!0),e.setRenderTarget(r),this._fsQuad.render(e),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=n}this.renderToScreen&&(this._fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=r.texture,e.setRenderTarget(null),this._fsQuad.render(e))}_updateSelectionCache(){let e=this._selectionCache;function t(t){t.isMesh&&e.add(t)}e.clear();for(let e=0;e<this.selectedObjects.length;e++)this.selectedObjects[e].traverse(t)}_changeVisibilityOfSelectedObjects(e){let t=this._visibilityCache;for(let n of this._selectionCache)e===!0?n.visible=t.get(n):(t.set(n,n.visible),n.visible=e)}_changeVisibilityOfNonSelectedObjects(e){let t=this._visibilityCache,n=this._selectionCache;function r(r){if(r.isPoints||r.isLine||r.isLine2)e===!0?r.visible=t.get(r):(t.set(r,r.visible),r.visible=e);else if((r.isMesh||r.isSprite)&&!n.has(r)){let n=r.visible;(e===!1||t.get(r)===!0)&&(r.visible=e),t.set(r,n)}}this.renderScene.traverse(r)}_updateTextureMatrix(){this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.textureMatrix.multiply(this.renderCamera.projectionMatrix),this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse)}_getPrepareMaskMaterial(){return new e({uniforms:{depthTexture:{value:null},cameraNearFar:{value:new n(.5,.5)},textureMatrix:{value:null}},vertexShader:`#include <batching_pars_vertex>
				#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				varying vec4 projTexCoord;
				varying vec4 vPosition;
				uniform mat4 textureMatrix;

				void main() {

					#include <batching_vertex>
					#include <skinbase_vertex>
					#include <begin_vertex>
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					#include <project_vertex>

					vPosition = mvPosition;

					vec4 worldPosition = vec4( transformed, 1.0 );

					#ifdef USE_INSTANCING

						worldPosition = instanceMatrix * worldPosition;

					#endif

					worldPosition = modelMatrix * worldPosition;

					projTexCoord = textureMatrix * worldPosition;

				}`,fragmentShader:`#include <packing>
				varying vec4 vPosition;
				varying vec4 projTexCoord;
				uniform sampler2D depthTexture;
				uniform vec2 cameraNearFar;

				void main() {

					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));
					float viewZ = - DEPTH_TO_VIEW_Z( depth, cameraNearFar.x, cameraNearFar.y );
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);

				}`})}_getEdgeDetectionMaterial(){return new e({uniforms:{maskTexture:{value:null},texSize:{value:new n(.5,.5)},visibleEdgeColor:{value:new i(1,1,1)},hiddenEdgeColor:{value:new i(1,1,1)}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform vec2 texSize;
				uniform vec3 visibleEdgeColor;
				uniform vec3 hiddenEdgeColor;

				void main() {
					vec2 invSize = 1.0 / texSize;
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);
					float diff1 = (c1.r - c2.r)*0.5;
					float diff2 = (c3.r - c4.r)*0.5;
					float d = length( vec2(diff1, diff2) );
					float a1 = min(c1.g, c2.g);
					float a2 = min(c3.g, c4.g);
					float visibilityFactor = min(a1, a2);
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);
				}`})}_getSeparableBlurMaterial(t){return new e({defines:{MAX_RADIUS:t},uniforms:{colorTexture:{value:null},texSize:{value:new n(.5,.5)},direction:{value:new n(.5,.5)},kernelRadius:{value:1}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;
				uniform float kernelRadius;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}

				void main() {
					vec2 invSize = 1.0 / texSize;
					float sigma = kernelRadius/2.0;
					float weightSum = gaussianPdf(0.0, sigma);
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);
					vec2 uvOffset = delta;
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {
						float x = kernelRadius * float(i) / float(MAX_RADIUS);
						float w = gaussianPdf(x, sigma);
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
						diffuseSum += ((sample1 + sample2) * w);
						weightSum += (2.0 * w);
						uvOffset += delta;
					}
					gl_FragColor = diffuseSum/weightSum;
				}`})}_getOverlayMaterial(){return new e({uniforms:{maskTexture:{value:null},edgeTexture1:{value:null},edgeTexture2:{value:null},patternTexture:{value:null},edgeStrength:{value:1},edgeGlow:{value:1},usePatternTexture:{value:0}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform sampler2D edgeTexture1;
				uniform sampler2D edgeTexture2;
				uniform sampler2D patternTexture;
				uniform float edgeStrength;
				uniform float edgeGlow;
				uniform bool usePatternTexture;

				void main() {
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);
					vec4 maskColor = texture2D(maskTexture, vUv);
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);
					float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;
					vec4 finalColor = edgeStrength * maskColor.r * edgeValue;
					if(usePatternTexture)
						finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);
					gl_FragColor = finalColor;
				}`,blending:2,depthTest:!1,depthWrite:!1,transparent:!0})}};ye.BlurDirectionX=new n(1,0),ye.BlurDirectionY=new n(0,1);var M={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},be=class extends D{constructor(){super(),this.isOutputPass=!0,this.uniforms=l.clone(M.uniforms),this.material=new re({name:M.name,uniforms:this.uniforms,vertexShader:M.vertexShader,fragmentShader:M.fragmentShader}),this._fsQuad=new k(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},ae.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},xe={name:`FXAAShader`,uniforms:{tDiffuse:{value:null},resolution:{value:new n(1/1024,1/512)}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec2 resolution;
		varying vec2 vUv;

		#define EDGE_STEP_COUNT 6
		#define EDGE_GUESS 8.0
		#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0
		const float edgeSteps[EDGE_STEP_COUNT] = float[EDGE_STEP_COUNT]( EDGE_STEPS );

		float _ContrastThreshold = 0.0312;
		float _RelativeThreshold = 0.063;
		float _SubpixelBlending = 1.0;

		vec4 Sample( sampler2D  tex2D, vec2 uv ) {

			return texture( tex2D, uv );

		}

		float SampleLuminance( sampler2D tex2D, vec2 uv ) {

			return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );

		}

		float SampleLuminance( sampler2D tex2D, vec2 texSize, vec2 uv, float uOffset, float vOffset ) {

			uv += texSize * vec2(uOffset, vOffset);
			return SampleLuminance(tex2D, uv);

		}

		struct LuminanceData {

			float m, n, e, s, w;
			float ne, nw, se, sw;
			float highest, lowest, contrast;

		};

		LuminanceData SampleLuminanceNeighborhood( sampler2D tex2D, vec2 texSize, vec2 uv ) {

			LuminanceData l;
			l.m = SampleLuminance( tex2D, uv );
			l.n = SampleLuminance( tex2D, texSize, uv,  0.0,  1.0 );
			l.e = SampleLuminance( tex2D, texSize, uv,  1.0,  0.0 );
			l.s = SampleLuminance( tex2D, texSize, uv,  0.0, -1.0 );
			l.w = SampleLuminance( tex2D, texSize, uv, -1.0,  0.0 );

			l.ne = SampleLuminance( tex2D, texSize, uv,  1.0,  1.0 );
			l.nw = SampleLuminance( tex2D, texSize, uv, -1.0,  1.0 );
			l.se = SampleLuminance( tex2D, texSize, uv,  1.0, -1.0 );
			l.sw = SampleLuminance( tex2D, texSize, uv, -1.0, -1.0 );

			l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
			l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
			l.contrast = l.highest - l.lowest;
			return l;

		}

		bool ShouldSkipPixel( LuminanceData l ) {

			float threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
			return l.contrast < threshold;

		}

		float DeterminePixelBlendFactor( LuminanceData l ) {

			float f = 2.0 * ( l.n + l.e + l.s + l.w );
			f += l.ne + l.nw + l.se + l.sw;
			f *= 1.0 / 12.0;
			f = abs( f - l.m );
			f = clamp( f / l.contrast, 0.0, 1.0 );

			float blendFactor = smoothstep( 0.0, 1.0, f );
			return blendFactor * blendFactor * _SubpixelBlending;

		}

		struct EdgeData {

			bool isHorizontal;
			float pixelStep;
			float oppositeLuminance, gradient;

		};

		EdgeData DetermineEdge( vec2 texSize, LuminanceData l ) {

			EdgeData e;
			float horizontal =
				abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.se - 2.0 * l.e ) +
				abs( l.nw + l.sw - 2.0 * l.w );
			float vertical =
				abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.nw - 2.0 * l.n ) +
				abs( l.se + l.sw - 2.0 * l.s );
			e.isHorizontal = horizontal >= vertical;

			float pLuminance = e.isHorizontal ? l.n : l.e;
			float nLuminance = e.isHorizontal ? l.s : l.w;
			float pGradient = abs( pLuminance - l.m );
			float nGradient = abs( nLuminance - l.m );

			e.pixelStep = e.isHorizontal ? texSize.y : texSize.x;

			if (pGradient < nGradient) {

				e.pixelStep = -e.pixelStep;
				e.oppositeLuminance = nLuminance;
				e.gradient = nGradient;

			} else {

				e.oppositeLuminance = pLuminance;
				e.gradient = pGradient;

			}

			return e;

		}

		float DetermineEdgeBlendFactor( sampler2D  tex2D, vec2 texSize, LuminanceData l, EdgeData e, vec2 uv ) {

			vec2 uvEdge = uv;
			vec2 edgeStep;
			if (e.isHorizontal) {

				uvEdge.y += e.pixelStep * 0.5;
				edgeStep = vec2( texSize.x, 0.0 );

			} else {

				uvEdge.x += e.pixelStep * 0.5;
				edgeStep = vec2( 0.0, texSize.y );

			}

			float edgeLuminance = ( l.m + e.oppositeLuminance ) * 0.5;
			float gradientThreshold = e.gradient * 0.25;

			vec2 puv = uvEdge + edgeStep * edgeSteps[0];
			float pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
			bool pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;

			for ( int i = 1; i < EDGE_STEP_COUNT && !pAtEnd; i++ ) {

				puv += edgeStep * edgeSteps[i];
				pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
				pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;

			}

			if ( !pAtEnd ) {

				puv += edgeStep * EDGE_GUESS;

			}

			vec2 nuv = uvEdge - edgeStep * edgeSteps[0];
			float nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
			bool nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;

			for ( int i = 1; i < EDGE_STEP_COUNT && !nAtEnd; i++ ) {

				nuv -= edgeStep * edgeSteps[i];
				nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
				nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;

			}

			if ( !nAtEnd ) {

				nuv -= edgeStep * EDGE_GUESS;

			}

			float pDistance, nDistance;
			if ( e.isHorizontal ) {

				pDistance = puv.x - uv.x;
				nDistance = uv.x - nuv.x;

			} else {

				pDistance = puv.y - uv.y;
				nDistance = uv.y - nuv.y;

			}

			float shortestDistance;
			bool deltaSign;
			if ( pDistance <= nDistance ) {

				shortestDistance = pDistance;
				deltaSign = pLuminanceDelta >= 0.0;

			} else {

				shortestDistance = nDistance;
				deltaSign = nLuminanceDelta >= 0.0;

			}

			if ( deltaSign == ( l.m - edgeLuminance >= 0.0 ) ) {

				return 0.0;

			}

			return 0.5 - shortestDistance / ( pDistance + nDistance );

		}

		vec4 ApplyFXAA( sampler2D  tex2D, vec2 texSize, vec2 uv ) {

			LuminanceData luminance = SampleLuminanceNeighborhood( tex2D, texSize, uv );
			if ( ShouldSkipPixel( luminance ) ) {

				return Sample( tex2D, uv );

			}

			float pixelBlend = DeterminePixelBlendFactor( luminance );
			EdgeData edge = DetermineEdge( texSize, luminance );
			float edgeBlend = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
			float finalBlend = max( pixelBlend, edgeBlend );

			if (edge.isHorizontal) {

				uv.y += edge.pixelStep * finalBlend;

			} else {

				uv.x += edge.pixelStep * finalBlend;

			}

			return Sample( tex2D, uv );

		}

		void main() {

			gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );

		}`},N=e=>Math.max(-1,Math.min(1,e)),P=(e,t)=>(e-t+540)%360-180,F=e=>Math.abs(e)<.4?0:e-Math.sign(e)*.4;function I({top:e,height:t},n){if(t<=0||n<=0)return 0;let r=(n-t)/2-e;return Math.abs(r)<.5?0:N(r/((n+t)/2))}var Se=class{constructor({surface:e,section:t,wake:n,onMotion:r,environment:i=window}){this.env=i,this.surface=e,this.wake=n,this.onMotion=r,this.section=t,this.scrollX=0,this.mouseBlend=+!t,this.scrollGain=1,this.mousePosition=null,this.target={x:0,y:0},this.current={x:0,y:0},this.filtered={x:0,y:0},this.neutral=null,this.gain=1,this.focused=!1,this.visible=!1,this.reduced=!1,this.enabled=!1,this.disposed=!1,this.sensorAttached=!1,this.lastTime=0,this.coarse=i.matchMedia(`(pointer: coarse)`),this.move=e=>{this.coarse.matches||e.pointerType!==`mouse`||(this.mousePosition={x:e.clientX,y:e.clientY},this.active&&this.readMouse())},this.leave=()=>{this.mousePosition=null,this.enabled||this.setInput(0,0)},this.orientation=e=>this.readOrientation(e),this.recalibrate=()=>{this.neutral=null,this.filtered.x=this.filtered.y=0,this.setInput(0,0)},this.scroll=()=>this.updateScroll(),e.addEventListener(`pointermove`,this.move,{passive:!0}),e.addEventListener(`pointerleave`,this.leave,{passive:!0}),i.addEventListener(`blur`,this.leave),this.direction=i.screen?.orientation,this.direction?.addEventListener?.(`change`,this.recalibrate),i.addEventListener(`orientationchange`,this.recalibrate),t&&(i.addEventListener(`scroll`,this.scroll,{passive:!0}),i.addEventListener(`resize`,this.scroll,{passive:!0}))}get active(){return this.visible&&!this.reduced&&!this.env.document.hidden&&!this.disposed}get mouseWeight(){return 1+(this.mouseBlend-1)*this.scrollGain}get scrollAngle(){return this.scrollX*.35*this.scrollGain}get yawAngle(){return this.current.x*.045*this.gain*this.mouseWeight+this.scrollAngle}get pitchInput(){return this.current.y*this.mouseWeight}readMouse(){this.mousePosition&&this.setInput(this.mousePosition.x/this.env.innerWidth*2-1,1-this.mousePosition.y/this.env.innerHeight*2)}updateScroll(){if(!this.active||!this.section||this.focused)return;let e=I(this.section.getBoundingClientRect(),this.env.innerHeight),t=Math.max(this.mouseBlend,1-Math.abs(e));(e!==this.scrollX||t!==this.mouseBlend)&&(this.scrollX=e,this.mouseBlend=t,this.wake())}setInput(e,t){this.target.x=N(e),this.target.y=N(t),this.active&&this.wake()}setActivity(e,t){let n=this.active;this.visible=e,this.reduced=t,this.lastTime=0,this.active?(!n&&!this.focused&&!this.coarse.matches&&(this.readMouse(),Object.assign(this.current,this.target)),this.updateScroll(),this.enabled&&this.attachSensor()):(this.scrollX=0,this.mouseBlend=+!this.section,this.scrollGain=+!this.focused,this.target.x=this.target.y=this.current.x=this.current.y=0,this.gain=this.focused?.2:1,this.detachSensor())}setFocus(e){this.focused=e,this.active&&(e||this.updateScroll(),this.wake())}async toggleMotion(){if(this.disposed)return;if(this.enabled){this.enabled=!1,this.detachSensor(),this.setInput(0,0),this.onMotion(`idle`);return}let e=this.env.DeviceOrientationEvent;if(this.reduced){this.onMotion(`reduced`);return}if(!e||!this.env.isSecureContext){this.onMotion(`unavailable`);return}this.onMotion(`requesting`);try{let t=typeof e.requestPermission==`function`?await e.requestPermission():`granted`;if(this.disposed)return;if(t!==`granted`){this.onMotion(`denied`);return}this.enabled=!0,this.onMotion(`enabled`),this.active&&this.attachSensor()}catch{this.disposed||this.onMotion(`denied`)}}attachSensor(){this.sensorAttached||(this.sensorAttached=!0,this.recalibrate(),this.env.addEventListener(`deviceorientation`,this.orientation,{passive:!0}),this.sensorTimeout=this.env.setTimeout(()=>{!this.neutral&&this.active&&(this.enabled=!1,this.detachSensor(),this.onMotion(`unavailable`))},2500))}detachSensor(){this.env.clearTimeout(this.sensorTimeout),this.env.removeEventListener(`deviceorientation`,this.orientation),this.sensorAttached=!1,this.neutral=null}readOrientation({beta:e,gamma:t}){if(!this.active||!this.enabled||!Number.isFinite(e)||!Number.isFinite(t))return;if(!this.neutral){this.neutral={beta:e,gamma:t},this.env.clearTimeout(this.sensorTimeout);return}let n=N(F(P(t,this.neutral.gamma))/12),r=N(-F(P(e,this.neutral.beta))/10),i=(this.direction?.angle??this.env.orientation??0)*Math.PI/180,a=n*Math.cos(i)-r*Math.sin(i),o=n*Math.sin(i)+r*Math.cos(i);this.filtered.x+=(N(a)-this.filtered.x)*.18,this.filtered.y+=(N(o)-this.filtered.y)*.18,this.setInput(this.filtered.x,this.filtered.y)}step(e){let t=this.lastTime?Math.min((e-this.lastTime)/1e3,.05):1/60;this.lastTime=e;let n=1-.945**(t*60),r=!1,i=this.focused?.2:1;this.gain+=(i-this.gain)*n,Math.abs(i-this.gain)<2e-4?this.gain=i:r=!0;let a=+!this.focused;this.scrollGain+=(a-this.scrollGain)*n,Math.abs(a-this.scrollGain)<2e-4?this.scrollGain=a:r=!0;for(let e of[`x`,`y`]){let t=this.active?this.target[e]:0;this.current[e]+=(t-this.current[e])*n,Math.abs(t-this.current[e])<2e-4?this.current[e]=t:r=!0}return r||(this.lastTime=0),r}dispose(){this.disposed=!0,this.detachSensor(),this.surface.removeEventListener(`pointermove`,this.move),this.surface.removeEventListener(`pointerleave`,this.leave),this.env.removeEventListener(`blur`,this.leave),this.direction?.removeEventListener?.(`change`,this.recalibrate),this.env.removeEventListener(`orientationchange`,this.recalibrate),this.section&&(this.env.removeEventListener(`scroll`,this.scroll),this.env.removeEventListener(`resize`,this.scroll))}},L=[`monitor`,`robot_arm`,`telephone`],Ce=e=>e*e*(3-2*e);function we(e){let t=new Set,n=new Set,r=new Set;e.traverse(e=>{e.isMesh&&(t.add(e.geometry),(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>{n.add(e),Object.values(e).forEach(e=>{e?.isTexture&&r.add(e)})}))}),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),r.forEach(e=>{e.dispose(),e.source.data?.close?.()})}function R(e,t,o){let c=window.matchMedia(`(pointer: coarse)`).matches||window.innerWidth<760,l=new ie({alpha:!0,antialias:!0,powerPreference:`high-performance`});l.setPixelRatio(Math.min(Math.max(window.devicePixelRatio||1,c?1.25:1.5),c?1.5:1.75)),l.shadowMap.enabled=!0,l.shadowMap.type=1,l.shadowMap.autoUpdate=!1,l.toneMapping=4,l.toneMappingExposure=.75,l.setClearColor(`#eeefea`,0),l.domElement.setAttribute(`aria-label`,`等轴测工作室场景，可选择显示器、机械臂和电话`),e.appendChild(l.domElement);let u=new d,f=new oe(14,1,.01,100),p=new me,m=new le(l),h=m.fromScene(p,.04);u.environment=h.texture,u.environmentIntensity=.8,p.dispose(),m.dispose(),u.add(new fe(`#ffffff`,`#9b9b96`,.55));let g=new ne(`#ffffff`,1.6);g.position.set(-2.5,7,3.5),g.target.position.set(0,.4,0),g.castShadow=!0,g.shadow.mapSize.set(c?2048:4096,c?2048:4096),Object.assign(g.shadow.camera,{left:-1.8,right:1.8,top:1.8,bottom:-1.8,near:.5,far:15}),g.shadow.bias=-1e-4,g.shadow.normalBias=.004,g.shadow.radius=c?6:12,g.shadow.intensity=.65,u.add(g.target),u.add(g);let re=new ne(`#ffffff`,.8);re.position.set(4,3,-3),u.add(re);let _=document.createElement(`canvas`);_.width=128,_.height=128;let v=_.getContext(`2d`),y=v.createRadialGradient(64,64,10,64,64,64);y.addColorStop(0,`rgba(37,39,36,.16)`),y.addColorStop(.55,`rgba(37,39,36,.09)`),y.addColorStop(1,`rgba(37,39,36,0)`),v.fillStyle=y,v.fillRect(0,0,128,128);let ae=new te(_),S=new x(new ee(2.8,2.4),new a({map:ae,transparent:!0,depthWrite:!1,toneMapped:!1}));S.rotation.x=-Math.PI/2,S.position.y=-.003,u.add(S);let C=new x(new ee(200,200),new de({opacity:.16}));C.rotation.x=-Math.PI/2,C.position.y=-.002,C.receiveShadow=!0,u.add(C);let w=new _e(l);w.renderTarget1.samples=c?2:4,w.renderTarget2.samples=c?2:4;let T=new ve(u,f),E=new ye(new n(1,1),u,f);E.visibleEdgeColor.set(`#dfff00`),E.hiddenEdgeColor.set(`#dfff00`),E.edgeThickness=1.25,E.edgeGlow=.45,E.pulsePeriod=0;let D=new be;D.uniforms.workspaceBackground={value:new b(`#eeefea`).convertLinearToSRGB()},D.uniforms.workspaceRuleColor={value:new b(`#ced1c4`).convertLinearToSRGB()},D.uniforms.workspaceRule={value:new s(1,1,66.5,0)},D.material.fragmentShader=D.material.fragmentShader.replace(`uniform sampler2D tDiffuse;`,`uniform sampler2D tDiffuse;
      uniform vec3 workspaceBackground;
      uniform vec3 workspaceRuleColor;
      uniform vec4 workspaceRule;`).replace(`// tone mapping`,`float coverage = clamp(gl_FragColor.a, 0.0, 1.0);
 gl_FragColor.rgb /= max(coverage, 0.0001);
 // tone mapping`).replace(/\n\s*}\s*$/,`
      float rule = (1.0 - smoothstep(0.25, 0.75, abs(vUv.y * workspaceRule.y - workspaceRule.z)))
        * step(workspaceRule.w, vUv.x * workspaceRule.x) * step(14.0, (1.0 - vUv.x) * workspaceRule.x);
      float endTick = (1.0 - smoothstep(0.25, 0.75, abs((1.0 - vUv.x) * workspaceRule.x - 14.0)))
        * (1.0 - smoothstep(2.0, 2.5, abs(vUv.y * workspaceRule.y - workspaceRule.z)));
      rule = max(rule, endTick);
      vec3 backdrop = mix(workspaceBackground, workspaceRuleColor, rule);
      // Fade scene coverage horizontally, preserving the continuous drafting
      // rule underneath. The bottom edge deliberately remains unmasked.
      float leftFade = smoothstep(0.0, min(110.0, workspaceRule.x * 0.15), vUv.x * workspaceRule.x);
      gl_FragColor.rgb = mix(backdrop, gl_FragColor.rgb, coverage * leftFade);
      gl_FragColor.a = 1.0;
    }`);let he=new ge(xe);w.addPass(T),w.addPass(E),w.addPass(D),w.addPass(he);let O,k,A=1,j=1,M=1,N=0,P=0,F=!1,I=null,R=null,z=!1,Te=0,Ee=0,De=0,B={},V={},Oe=[],ke=new n,Ae=new ue,je=new b(`#dfff00`),H=window.matchMedia(`(prefers-reduced-motion: reduce)`),U=new i,Me=new i(1,1,1).normalize(),Ne=new i,W=new i,G=new i,Pe=new i,Fe=new i,Ie=new i,K=new i,q=7,Le=0,J=!1,Re=new i,ze=new i,Be=new i(0,1,0),Y=new i,Ve=new i,X=new se,He=new se,Z=new Se({surface:document.documentElement,section:e.closest(`#skills`),wake:()=>Q(),onMotion:e=>t.onMotion(e)}),Ue=e=>Array.from({length:8},(t,n)=>new i(n&1?e.max.x:e.min.x,n&2?e.max.y:e.min.y,n&4?e.max.z:e.min.z)),We=e=>{let t=Ue(e).map(e=>e.project(f)),n=t.map(e=>(e.x+1)*A/2),r=t.map(e=>(1-e.y)*j/2);return{x:Math.min(...n),y:Math.min(...r),width:Math.max(...n)-Math.min(...n),height:Math.max(...r)-Math.min(...r)}},Ge=()=>{if(!O)return;let e={};L.forEach(t=>{e[t]=We(V[t])}),t.onLayout(e,{width:A,height:j},performance.now())},Ke=(e=!1)=>{k&&(Z.setFocus(!!I),Pe.copy(W),Fe.copy(G),K.copy(U),Ve.copy(Me),I&&V[I]&&(K.lerp(V[I].getCenter(new i),.35),I===`telephone`&&Ve.applyAxisAngle(Be,-.32),I===`robot_arm`&&Ve.applyAxisAngle(Be,.28)),Ie.copy(K).addScaledVector(Ve,q*(I?.84:1)),Le=performance.now(),J=!e&&!H.matches,J||(W.copy(Ie),G.copy(K)),Q())},qe=()=>{if(!k)return;k.getCenter(U),f.position.copy(U).add(new i(4,4,4)),f.lookAt(U),f.updateMatrixWorld();let e=f.quaternion.clone().invert(),t=Ue(k).map(t=>t.sub(U).applyQuaternion(e));f.setViewOffset(A,M,0,0,A,j);let n=Math.tan(r.degToRad(f.fov/2));q=Math.max(...t.map(e=>e.z+Math.max(Math.abs(e.y),Math.abs(e.x)/f.aspect)*1.045/n));let a=k.getSize(new i).length();f.near=Math.max(.1,q*.15),f.far=q+a*3,G.copy(U),W.copy(U).addScaledVector(Me,q),f.updateProjectionMatrix(),Ke(!0),f.position.copy(W),Ne.copy(G),f.lookAt(Ne),f.updateMatrixWorld(),Ge()},Je=t=>{if(N=0,F||!z||document.hidden||!O)return;let n=Z.step(t);if(J){let e=H.matches?1:Math.min(1,(t-Le)/900);W.lerpVectors(Pe,Ie,Ce(e)),G.lerpVectors(Fe,K,Ce(e)),J=e<1}let i=Z.gain;V.monitor.getCenter(Y),X.setFromAxisAngle(Be,-Z.yawAngle),Re.subVectors(W,G).applyQuaternion(X),ze.crossVectors(Be,Re).normalize(),He.setFromAxisAngle(ze,-Z.pitchInput*.026*i),X.premultiply(He),f.position.copy(W).sub(Y).applyQuaternion(X).add(Y),Ne.copy(G).sub(Y).applyQuaternion(X).add(Y),f.lookAt(Ne),f.updateMatrixWorld(),Ge();let a=H.matches?1:Math.min(1,(t-Te)/420),o=Ce(a);Oe.forEach(e=>{let t=r.lerp(e.fromDim,e.toDim,o),n=r.lerp(e.fromGlow,e.toGlow,o);e.dim=t,e.glow=n,e.material.color.copy(e.color).multiplyScalar(t),e.material.emissive.copy(e.emissive).multiplyScalar(t),e.material.emissive.r+=je.r*n,e.material.emissive.g+=je.g*n,e.material.emissive.b+=je.b*n}),E.edgeStrength=r.lerp(Ee,De,o),E.enabled=E.edgeStrength>.001,w.render(),e.dataset.cameraMotion=J||n?`moving`:`idle`,(a<1||J||n)&&(N=requestAnimationFrame(Je))},Q=()=>{!N&&z&&!document.hidden&&!F&&(N=requestAnimationFrame(Je))},Ye=()=>{let e=R||I;e&&B[e]&&(E.selectedObjects=[B[e]]),Ee=E.edgeStrength,De=e?3.5:0,Oe.forEach(t=>{t.fromDim=t.dim,t.fromGlow=t.glow,t.toDim=e&&t.name!==e?.76:1,t.toGlow=t.name===e?.065:0}),Te=performance.now(),Q()},Xe=e=>{R!==e&&(R=e,l.domElement.style.cursor=e?`pointer`:``,t.onHover(e),Ye())},Ze=e=>{if(!O)return null;let t=l.domElement.getBoundingClientRect();ke.set((e.clientX-t.left)/t.width*2-1,-(e.clientY-t.top)/t.height*2+1),Ae.setFromCamera(ke,f);let n=Ae.intersectObject(O,!0)[0]?.object;for(;n&&n!==O;){if(L.includes(n.name))return n.name;n=n.parent}return null},Qe,$e=e=>{z&&!document.hidden&&e.pointerType===`mouse`&&(Qe={clientX:e.clientX,clientY:e.clientY},P||=requestAnimationFrame(()=>{P=0,Xe(Ze(Qe))}))},et=()=>{cancelAnimationFrame(P),P=0,Xe(null)},$,tt=e=>{$={x:e.clientX,y:e.clientY}},nt=e=>{$&&Math.hypot(e.clientX-$.x,e.clientY-$.y)>8||t.onSelect(Ze(e))},rt=()=>{A=Math.max(1,e.clientWidth),j=Math.max(1,e.clientHeight),M=Math.max(1,e.parentElement.clientHeight);let t=window.innerWidth<760||window.matchMedia(`(pointer: coarse)`).matches;l.setPixelRatio(Math.min(Math.max(window.devicePixelRatio||1,t?1.25:1.5),t?1.5:1.75));let n=e.parentElement.querySelector(`.scene-footer`),r=e.getBoundingClientRect(),i=n.getBoundingClientRect();D.uniforms.workspaceRule.value.set(A,j,j-(i.top-r.top)-.5,parseFloat(getComputedStyle(n).left)),l.setSize(A,j),w.setSize(A,j),qe(),Z.updateScroll(),Q(),he.uniforms.resolution.value.set(1/(A*l.getPixelRatio()),1/(j*l.getPixelRatio()))},it=new ResizeObserver(rt);it.observe(e);let at=new IntersectionObserver(t=>{z=t[0].isIntersecting,Z.setActivity(z,H.matches),z?Q():(cancelAnimationFrame(N),N=0,et(),e.dataset.cameraMotion=`paused`)});at.observe(e);let ot=()=>{Z.setActivity(z,H.matches),document.hidden?(cancelAnimationFrame(N),N=0,et(),e.dataset.cameraMotion=`paused`):Q()},st=()=>{Z.setActivity(z,H.matches),Ke(!0),Ye()};document.addEventListener(`visibilitychange`,ot),H.addEventListener(`change`,st),l.domElement.addEventListener(`pointermove`,$e),l.domElement.addEventListener(`pointerleave`,et),l.domElement.addEventListener(`pointerdown`,tt),l.domElement.addEventListener(`click`,nt);let ct=e=>{e.preventDefault(),t.onError()};return l.domElement.addEventListener(`webglcontextlost`,ct),o.then(e=>new pe().parseAsync(e,`/models/`)).then(async e=>{if(F){we(e.scene);return}O=e.scene;let n=[];O.traverse(e=>{(e.isLight||e.isCamera)&&n.push(e)}),n.forEach(e=>e.removeFromParent());let r=new Set,i=new Map;O.traverse(e=>{if(!e.isMesh)return;e.castShadow=!0,e.receiveShadow=!0;let t=e;for(;t.parent&&t.parent!==O;)t=t.parent;let n=t.name,a=e=>{let t=`${e.uuid}/${n}`;if(i.has(t))return i.get(t);r.add(e);let a=e.clone();return i.set(t,a),a.emissiveMap&&e.name.includes(`Monitor CAD image`)&&(a.polygonOffset=!0,a.polygonOffsetFactor=-2,a.polygonOffsetUnits=-4),[a.map,a.emissiveMap].filter(Boolean).forEach(e=>{e.anisotropy=Math.min(8,l.capabilities.getMaxAnisotropy())}),a.emissiveIntensity>1&&(a.emissiveIntensity=1.1),Oe.push({name:n,material:a,color:a.color.clone(),emissive:a.emissive.clone(),dim:1,glow:0,fromDim:1,toDim:1,fromGlow:0,toGlow:0}),a};e.material=Array.isArray(e.material)?e.material.map(a):a(e.material)}),r.forEach(e=>e.dispose()),u.add(O),O.updateMatrixWorld(!0),L.forEach(e=>{if(B[e]=O.getObjectByName(e),!B[e])throw Error(`Missing interactive object: ${e}`);V[e]=new ce().setFromObject(B[e])}),k=new ce().setFromObject(O),l.shadowMap.needsUpdate=!0,S.visible=!1,C.visible=!1,rt(),await l.compileAsync(u,f),!F&&(l.render(u,f),S.visible=!0,C.visible=!0,E.selectedObjects=L.map(e=>B[e]),E.edgeStrength=0,w.render(),E.enabled=!1,E.selectedObjects=[],w.render(),Ye(),t.onReady())}).catch(e=>{!F&&e.name!==`AbortError`&&t.onError(e)}),{select(e){I!==e&&(I=e,Ke()),Ye()},toggleMotion(){return Z.toggleMotion()},hover:Xe,dispose(){F=!0,cancelAnimationFrame(N),cancelAnimationFrame(P),Z.dispose(),it.disconnect(),at.disconnect(),document.removeEventListener(`visibilitychange`,ot),H.removeEventListener(`change`,st),l.domElement.removeEventListener(`pointermove`,$e),l.domElement.removeEventListener(`pointerleave`,et),l.domElement.removeEventListener(`pointerdown`,tt),l.domElement.removeEventListener(`click`,nt),l.domElement.removeEventListener(`webglcontextlost`,ct),O&&we(O),S.geometry.dispose(),S.material.dispose(),ae.dispose(),C.geometry.dispose(),C.material.dispose(),g.shadow.dispose(),h.dispose(),T.dispose(),E.dispose(),D.dispose(),he.dispose(),w.dispose(),l.dispose(),l.domElement.remove()}}}export{R as createSkillsScene};