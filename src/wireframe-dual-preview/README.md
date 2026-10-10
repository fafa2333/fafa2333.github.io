# Architectural dual preview

Local route: `/wireframe-dual-preview/`. Experimental only; existing point-cloud
routes and production Education are unchanged.

The exporter reads BIT symmetry V6 and the saved Hive model, preserves their surface triangles
and extracts original polygon edges. Coplanar diagonals are excluded. Hive keeps
one contour per small rib plus main floor lips; curved side edges are GPU
silhouette candidates. No model edits, new sampling, Blender saves or textures.

BIT V6 mirrors the original front-left half about the central roof/facade axis
(Blender Y=1.261928873). The left geometry stays fixed; right wings, round ends,
window rows, floor bands and entrance match it. V5 and all point-cloud assets
remain intact. Refresh only BIT with `-- --model bit`; Hive data stays unchanged.
The new export contains 50,104 surface triangles and 47,680 line segments.
Symmetry inspection images: `renders/bit-symmetry-v6/`.

Hive V5 was separately saved from V4: the four service cores now have stepped
floor plates and real vertical peaked facade folds. The twelve rounded towers,
gallery geometry, atrium and coordinate datum remain identical to V4. To update
only Hive's line data, append `-- --model hive` to the export command below.

The viewer uses an invisible depth-only mesh followed by antialiased Three.js
LineSegments2. Rear lines are occluded; a GPU facing test updates curved contours
when dragged. LINE_STYLE centralizes line color/width, camera and independent
uniform scale multipliers. Paper color comes directly from the site's --paper.

Each ArchitecturalViewer owns its canvas, scene, normalization and independent
HorizontalRotation instance. The camera has a fixed 28-degree elevation; only
the centered Y-up parent group rotates. Auto yaw is +3 degrees/second, starting
at BIT +15 degrees and Hive -20 degrees. Horizontal drag uses .0055 rad/CSS-pixel;
on release, velocity smoothly approaches auto speed with a .12-second time
constant. The screen-centering offset stays outside the rotating group.
Rendering pauses outside the viewport and when hidden; reduced motion disables
auto rotation and inertia. Touch uses pan-y plus horizontal gesture detection,
so vertical scrolling remains available. Pan/zoom/pitch/roll are disabled.
ResizeObserver fits real surface bounds to 70% initial projected coverage.

To refresh derivative data (does not save the Blender sources):

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python scripts/export_architectural_lines.py
node --test tests/architectural-lines.test.mjs
node --test tests/wireframe-rotation.test.mjs
pnpm build --outDir /private/tmp/wireframe-dual-site-build --emptyOutDir
```

Browser proof: `renders/wireframe-dual-preview/dual-desktop.jpg`,
`dual-narrow-container.jpg` (390px iframe), and `verification.json`.
The 390px test uses a same-origin iframe because the in-app browser's viewport
override did not resize its virtual tab. The temporary harness was removed.

For Education integration, instantiate the same viewer in a card and reuse the
material/data; its sizing, independent interaction and visibility lifecycle
already follow the container. Production integration is deliberately deferred.
