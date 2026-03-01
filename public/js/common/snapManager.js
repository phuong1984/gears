// =============================================================================
// snapManager.js — Snap Points Manager
// =============================================================================
//
// Provides functions to:
//   1. Get snap points for any component (auto or semantic)
//   2. Transform snap points from local to world space
//   3. Find nearest compatible snap between dragged component and others
//
// Dependencies: SNAP_POINTS_DB (snapPointsDB.js), BABYLON
//
// COORDINATE CONVENTIONS:
//   - Snap points are stored in Descartes coords (X right, Y forward, Z up)
//   - BabylonJS uses (X right, Y up, Z forward)
//   - Conversion: Descartes [x,y,z] → BJS Vector3(x, z, y)
//
// =============================================================================

var SnapManager = (function () {
    'use strict';

    var self = {};

    // ===========================================================================
    // Configuration
    // ===========================================================================

    /** Distance threshold (in scene units) for snap detection */
    self.SNAP_THRESHOLD = 2.0;

    /** Minimum normal alignment (-1 = opposing, 0 = perpendicular, 1 = same dir) */
    /** We want opposing normals (face-to-face), so dot product < this value */
    self.NORMAL_THRESHOLD = -0.5;

    /** Whether snapping is currently enabled */
    self.enabled = true;

    /**
     * Compute a visual marker scale from a mesh's bounding box.
     * Returns a multiplier so markers are ~7% of the object's average dimension.
     * Clamped so markers are never invisibly small or absurdly large.
     */
    self.getMarkerScale = function (mesh) {
        if (!mesh || !mesh.getBoundingInfo) return 1.0;
        try {
            mesh.computeWorldMatrix(true);
            var ext = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
            var avg = (ext.x + ext.y + ext.z) / 3;
            // Base markers are designed for objects ~1 unit in radius (avg extend ~0.5)
            // So scale = avg / 0.5 = avg * 2, but we want ~7% of diameter → target ratio
            var s = Math.max(avg * 2, 0.5);  // at least 0.5 to avoid invisibly small
            return Math.min(s, 20);           // cap at 20 to avoid absurdly large
        } catch (e) {
            return 1.0;
        }
    };

    // ===========================================================================
    // 1. GET SNAP POINTS — for any component
    // ===========================================================================

    /**
     * Get snap points for a component.
     * Priority: semantic (from DB) → auto (from bounding box)
     *
     * @param {Object} component — The component object (has .type, .options, .body)
     * @returns {Array} Array of snap point objects in Descartes local coords
     */
    self.getSnapPoints = function (component) {
        if (!component) return [];

        var type = component.type;
        var options = component.options || {};

        // ── 1. Check for per-component config snap points (user-defined) ──
        if (options.snapPoints && Array.isArray(options.snapPoints) && options.snapPoints.length > 0) {
            return options.snapPoints;
        }

        // ── 1b. Body-specific: check bodySnapPoints ──
        if (type === '__body__' && options.bodySnapPoints && Array.isArray(options.bodySnapPoints) && options.bodySnapPoints.length > 0) {
            return options.bodySnapPoints;
        }

        // ── 1c. Body with 3D model: compute from model meshes bounding box ──
        if (type === '__body__' && component._bodyModelMeshes && component._bodyModelMeshes.length > 0) {
            try {
                var bodyMesh = component.body;
                bodyMesh.computeWorldMatrix(true);
                var bodyInv = BABYLON.Matrix.Invert(bodyMesh.getWorldMatrix());
                var wMin = null, wMax = null;
                var meshCount = 0;
                for (var mi = 0; mi < component._bodyModelMeshes.length; mi++) {
                    var mm = component._bodyModelMeshes[mi];
                    mm.computeWorldMatrix(true);
                    var mbb = mm.getBoundingInfo().boundingBox;
                    if (mbb.extendSize.x === 0 && mbb.extendSize.y === 0 && mbb.extendSize.z === 0) continue;
                    meshCount++;
                    // Use world-space AABB min/max directly
                    if (wMin === null) {
                        wMin = mbb.minimumWorld.clone();
                        wMax = mbb.maximumWorld.clone();
                    } else {
                        wMin = BABYLON.Vector3.Minimize(wMin, mbb.minimumWorld);
                        wMax = BABYLON.Vector3.Maximize(wMax, mbb.maximumWorld);
                    }
                }
                console.log('[BodySnap] step1c: meshCount=' + meshCount + '/' + component._bodyModelMeshes.length,
                    'wMin=', wMin ? wMin.toString() : 'null',
                    'wMax=', wMax ? wMax.toString() : 'null',
                    'bodyPos=', bodyMesh.position.toString(),
                    'bodyScaling=', bodyMesh.scaling.toString());
                if (wMin) {
                    // Transform AABB center to body-local space
                    var wCenter = wMin.add(wMax).scale(0.5);
                    var localCenter = BABYLON.Vector3.TransformCoordinates(wCenter, bodyInv);
                    // Size is the same in world and body-local (body has no scale)
                    var wSize = wMax.subtract(wMin);
                    var hw = wSize.x / 2;  // half-width
                    var hy = wSize.y / 2;  // half-height (BJS Y = up)
                    var hd = wSize.z / 2;  // half-depth (BJS Z = forward)
                    // Convert body-local BJS → Descartes: X=X, Y=Z(BJS), Z=Y(BJS)
                    var cx = localCenter.x;
                    var cy = localCenter.z;  // BJS Z → Descartes Y
                    var cz = localCenter.y;  // BJS Y → Descartes Z
                    console.log('[BodySnap] wCenter=', wCenter.toString(), 'localCenter=', localCenter.toString(),
                        'wSize=', wSize.toString(), 'hw=', hw, 'hy=', hy, 'hd=', hd,
                        'cx=', cx, 'cy=', cy, 'cz=', cz);
                    var result = [
                        { name: 'top', localPos: [cx, cy, cz + hy], normal: [0, 0, 1], role: 'surface' },
                        { name: 'bottom', localPos: [cx, cy, cz - hy], normal: [0, 0, -1], role: 'surface' },
                        { name: 'front', localPos: [cx, cy + hd, cz], normal: [0, 1, 0], role: 'surface' },
                        { name: 'back', localPos: [cx, cy - hd, cz], normal: [0, -1, 0], role: 'surface' },
                        { name: 'right', localPos: [cx + hw, cy, cz], normal: [1, 0, 0], role: 'surface' },
                        { name: 'left', localPos: [cx - hw, cy, cz], normal: [-1, 0, 0], role: 'surface' }
                    ];
                    console.log('[BodySnap] result:', JSON.stringify(result.map(function (p) { return p.name + '=' + JSON.stringify(p.localPos); })));
                    return result;
                }
            } catch (e) { console.error('[BodySnap] step1c error:', e); }
        }

        // ── 2. Check semantic snap points in DB ──
        var dbEntry = null;

        // For primitives, use __primitive__/Type key
        if (type === 'Box' || type === 'Cylinder' || type === 'Sphere') {
            dbEntry = SNAP_POINTS_DB['__primitive__/' + type];
        } else {
            dbEntry = SNAP_POINTS_DB[type];
        }

        if (dbEntry) {
            // Dynamic snap points (scale with dimensions)
            if (dbEntry.dynamic && typeof dbEntry.getSnapPoints === 'function') {
                if (type === '__body__') console.log('[BodySnap] step2 DB dynamic: using box dimensions fallback. _bodyModelMeshes=', component._bodyModelMeshes);
                return dbEntry.getSnapPoints(options);
            }
            // Static snap points
            if (dbEntry.snapPoints && dbEntry.snapPoints.length > 0) {
                return dbEntry.snapPoints;
            }
            // Explicitly null = use auto
            if (dbEntry.snapPoints === null) {
                return self.getAutoSnapPoints(component);
            }
            // Empty array = no snap points
            if (Array.isArray(dbEntry.snapPoints) && dbEntry.snapPoints.length === 0) {
                return [];
            }
        }

        // ── 3. Check for model-specific snap points (by URL) ──
        if (options.modelURL && SNAP_POINTS_DB[options.modelURL]) {
            var modelEntry = SNAP_POINTS_DB[options.modelURL];
            if (modelEntry.snapPoints && modelEntry.snapPoints.length > 0) {
                return modelEntry.snapPoints;
            }
        }

        // ── 4. Fallback: auto from bounding box ──
        return self.getAutoSnapPoints(component);
    };

    // ===========================================================================
    // 2. AUTO SNAP POINTS — from bounding box
    // ===========================================================================

    /**
     * Generate 6 snap points (center of each face) from a mesh's bounding box.
     * Uses hierarchy bounds (including child model meshes) if available.
     * Returns snap points in Descartes coordinates.
     *
     * @param {Object} component — The component object (has .body mesh)
     * @returns {Array} Array of 6 snap point objects
     */
    self.getAutoSnapPoints = function (component) {
        var mesh = component.body || component;
        if (!mesh || !mesh.getBoundingInfo) return [];

        try {
            mesh.computeWorldMatrix(true);

            var ex, ey, ez; // half-sizes in Descartes coords
            var cx = 0, cy = 0, cz = 0; // center in Descartes coords

            // Check if mesh has child meshes (e.g., loaded GLB model)
            var childMeshes = mesh.getChildMeshes ? mesh.getChildMeshes(false) : [];
            if (childMeshes.length > 0) {
                // Use hierarchy bounding vectors for combined bounds
                var bounds = mesh.getHierarchyBoundingVectors(true);
                var meshInv = BABYLON.Matrix.Invert(mesh.getWorldMatrix());
                // Transform world bounds to mesh-local space
                var localMin = BABYLON.Vector3.TransformCoordinates(bounds.min, meshInv);
                var localMax = BABYLON.Vector3.TransformCoordinates(bounds.max, meshInv);
                // Ensure min < max (negative scaling can swap them)
                var actualMin = BABYLON.Vector3.Minimize(localMin, localMax);
                var actualMax = BABYLON.Vector3.Maximize(localMin, localMax);
                var localCenter = actualMin.add(actualMax).scale(0.5);
                var localSize = actualMax.subtract(actualMin);
                // BJS → Descartes: X=X, Y=Z, Z=Y
                ex = localSize.x / 2;
                ey = localSize.z / 2;
                ez = localSize.y / 2;
                cx = localCenter.x;
                cy = localCenter.z;
                cz = localCenter.y;
            } else {
                // Single mesh: use its own bounding box
                var bb = mesh.getBoundingInfo().boundingBox;
                var ext = bb.extendSize;
                // BJS extendSize: x=X, y=Y(up), z=Z(forward)
                // Descartes: X=x, Y=z(forward), Z=y(up)
                ex = ext.x;
                ey = ext.z;
                ez = ext.y;
            }

            return [
                { name: 'top', localPos: [cx, cy, cz + ez], normal: [0, 0, 1], role: 'surface' },
                { name: 'bottom', localPos: [cx, cy, cz - ez], normal: [0, 0, -1], role: 'surface' },
                { name: 'front', localPos: [cx, cy + ey, cz], normal: [0, 1, 0], role: 'surface' },
                { name: 'back', localPos: [cx, cy - ey, cz], normal: [0, -1, 0], role: 'surface' },
                { name: 'right', localPos: [cx + ex, cy, cz], normal: [1, 0, 0], role: 'surface' },
                { name: 'left', localPos: [cx - ex, cy, cz], normal: [-1, 0, 0], role: 'surface' }
            ];
        } catch (e) {
            console.warn('SnapManager: Could not compute auto snap points', e);
            return [];
        }
    };

    // ===========================================================================
    // 3. COORDINATE TRANSFORMS — Descartes ↔ BabylonJS
    // ===========================================================================

    /**
     * Convert Descartes [x,y,z] to BABYLON.Vector3(x, z, y)
     */
    self.descartesToBJS = function (arr) {
        return new BABYLON.Vector3(arr[0], arr[2], arr[1]);
    };

    /**
     * Convert BABYLON.Vector3 to Descartes [x,y,z]
     */
    self.bjsToDescartes = function (vec3) {
        return [vec3.x, vec3.z, vec3.y];
    };

    /**
     * Transform a snap point from local Descartes coords to world BJS coords.
     *
     * @param {Object} snapPoint — { localPos: [x,y,z], normal: [x,y,z], ... }
     * @param {BABYLON.Mesh} mesh — The mesh whose world matrix to use
     * @returns {Object} { worldPos: BABYLON.Vector3, worldNormal: BABYLON.Vector3, ...original }
     */
    self.toWorldSpace = function (snapPoint, mesh) {
        if (!mesh) return null;

        mesh.computeWorldMatrix(true);
        var worldMatrix = mesh.getWorldMatrix();

        // Convert local Descartes pos to BJS Vector3
        var localPosBJS = self.descartesToBJS(snapPoint.localPos);

        // Transform position: local → world
        var worldPos = BABYLON.Vector3.TransformCoordinates(localPosBJS, worldMatrix);

        // Transform normal: only rotation, no translation
        var localNormalBJS = self.descartesToBJS(snapPoint.normal);
        var rotMatrix = new BABYLON.Matrix();
        worldMatrix.getRotationMatrixToRef(rotMatrix);
        var worldNormal = BABYLON.Vector3.TransformCoordinates(localNormalBJS, rotMatrix).normalize();

        return {
            name: snapPoint.name,
            role: snapPoint.role,
            localPos: snapPoint.localPos,
            normal: snapPoint.normal,
            worldPos: worldPos,
            worldNormal: worldNormal
        };
    };

    /**
     * Get all snap points for a component, transformed to world space.
     *
     * @param {Object} component — Component object
     * @returns {Array} Array of world-space snap point objects
     */
    self.getWorldSnapPoints = function (component) {
        var localPoints = self.getSnapPoints(component);
        var mesh = component.body || component;
        if (!mesh || !mesh.getWorldMatrix) return [];

        return localPoints.map(function (sp) {
            return self.toWorldSpace(sp, mesh);
        }).filter(function (sp) {
            return sp !== null;
        });
    };

    // ===========================================================================
    // 4. SNAP MATCHING (placeholder for Phase 4b — Task 1.5.4)
    // ===========================================================================

    /**
     * Find the nearest valid snap between a dragged component and all other components.
     * Returns the best snap candidate or null if none found.
     *
     * @param {Object} draggedComponent — The component being dragged
     * @param {Array} allComponents — All components in the scene
     * @param {number} [threshold] — Override snap threshold
     * @returns {Object|null} { source, target, distance, snapOffset } or null
     */
    self.findNearestSnap = function (draggedComponent, allComponents, threshold) {
        if (!self.enabled) return null;

        var dragMesh = draggedComponent.body || draggedComponent;
        var ms = self.getMarkerScale(dragMesh);
        var thresh = threshold || (self.SNAP_THRESHOLD * ms);
        var sourcePoints = self.getWorldSnapPoints(draggedComponent);
        if (sourcePoints.length === 0) return null;

        var candidates = [];

        for (var c = 0; c < allComponents.length; c++) {
            var otherComponent = allComponents[c];

            // Skip self
            if (otherComponent === draggedComponent) continue;
            if (otherComponent.body === draggedComponent.body) continue;

            var targetPoints = self.getWorldSnapPoints(otherComponent);

            for (var s = 0; s < sourcePoints.length; s++) {
                for (var t = 0; t < targetPoints.length; t++) {
                    var src = sourcePoints[s];
                    var tgt = targetPoints[t];

                    // Distance check
                    var distance = BABYLON.Vector3.Distance(src.worldPos, tgt.worldPos);
                    if (distance > thresh) continue;

                    // Normal alignment check: normals should be opposing (face-to-face)
                    var dotProduct = BABYLON.Vector3.Dot(src.worldNormal, tgt.worldNormal);
                    if (dotProduct > self.NORMAL_THRESHOLD) continue;

                    // Role compatibility check
                    if (!SNAP_POINTS_DB.isCompatible(src.role, tgt.role)) continue;

                    // Calculate the offset needed to snap source point to target point
                    var snapOffset = tgt.worldPos.subtract(src.worldPos);

                    candidates.push({
                        source: src,
                        target: tgt,
                        sourceComponent: draggedComponent,
                        targetComponent: otherComponent,
                        distance: distance,
                        dotProduct: dotProduct,
                        snapOffset: snapOffset
                    });
                }
            }
        }

        if (candidates.length === 0) return null;

        // Sort by distance (closest first)
        candidates.sort(function (a, b) {
            return a.distance - b.distance;
        });

        return candidates[0];
    };

    // ===========================================================================
    // 6. LIVE SNAP INDICATORS (Phase 4c — visual feedback during drag)
    // ===========================================================================

    /** Currently displayed snap indicator meshes */
    self._snapIndicators = [];

    /** Shared materials (created lazily) */
    self._indicatorMats = null;

    /** Initialize shared materials for snap indicators */
    self._ensureIndicatorMats = function (scene) {
        if (self._indicatorMats) return;

        // Source snap point — Cyan glow
        var srcMat = new BABYLON.StandardMaterial('snapIndicator_src', scene);
        srcMat.emissiveColor = new BABYLON.Color3(0, 0.9, 0.95);
        srcMat.diffuseColor = new BABYLON.Color3(0, 0.9, 0.95);
        srcMat.alpha = 0.85;
        srcMat.disableLighting = true;

        // Target snap point — Magenta glow
        var tgtMat = new BABYLON.StandardMaterial('snapIndicator_tgt', scene);
        tgtMat.emissiveColor = new BABYLON.Color3(0.95, 0.2, 0.9);
        tgtMat.diffuseColor = new BABYLON.Color3(0.95, 0.2, 0.9);
        tgtMat.alpha = 0.85;
        tgtMat.disableLighting = true;

        self._indicatorMats = { src: srcMat, tgt: tgtMat };
    };

    /**
     * Show snap indicators for a snap result (called each frame during drag).
     * Displays glowing spheres at source + target snap points, connected by a line.
     *
     * @param {Object} snapResult — from findNearestSnap: { source, target, ... }
     * @param {BABYLON.Scene} scene
     */
    self.showSnapIndicator = function (snapResult, scene) {
        self.hideSnapIndicator();
        if (!snapResult || !snapResult.source || !snapResult.target) return;

        self._ensureIndicatorMats(scene);

        var src = snapResult.source;
        var tgt = snapResult.target;
        var ms = (snapResult.sourceComponent && snapResult.sourceComponent.body)
            ? self.getMarkerScale(snapResult.sourceComponent.body) : 1.0;

        // Source marker (cyan)
        var srcSphere = BABYLON.MeshBuilder.CreateSphere(
            'snapInd_src', { diameter: 0.5 * ms, segments: 8 }, scene
        );
        srcSphere.position = src.worldPos.clone();
        srcSphere.material = self._indicatorMats.src;
        srcSphere.renderingGroupId = 2;
        srcSphere.isPickable = false;
        self._snapIndicators.push(srcSphere);

        // Target marker (magenta)
        var tgtSphere = BABYLON.MeshBuilder.CreateSphere(
            'snapInd_tgt', { diameter: 0.5 * ms, segments: 8 }, scene
        );
        tgtSphere.position = tgt.worldPos.clone();
        tgtSphere.material = self._indicatorMats.tgt;
        tgtSphere.renderingGroupId = 2;
        tgtSphere.isPickable = false;
        self._snapIndicators.push(tgtSphere);

        // Connecting guideline (dashed via multiple segments)
        var lineColor = new BABYLON.Color3(1, 0.95, 0.3); // Yellow
        var p1 = src.worldPos;
        var p2 = tgt.worldPos;
        var dist = BABYLON.Vector3.Distance(p1, p2);

        if (dist > 0.01) {
            // Create dashed line (solid segments with gaps)
            var dashCount = Math.max(2, Math.round(dist / 0.3));
            var points = [];
            for (var i = 0; i <= dashCount; i++) {
                var t = i / dashCount;
                points.push(BABYLON.Vector3.Lerp(p1, p2, t));
            }

            var line = BABYLON.MeshBuilder.CreateDashedLines(
                'snapInd_line',
                { points: points, dashSize: 2, gapSize: 1, dashNb: dashCount * 2 },
                scene
            );
            line.color = lineColor;
            line.renderingGroupId = 2;
            line.isPickable = false;
            self._snapIndicators.push(line);
        }

        // Normal arrows at each snap point (shows alignment direction)
        var arrowLen = 0.8 * ms;

        var srcArrowEnd = src.worldPos.add(src.worldNormal.scale(arrowLen));
        var srcArrow = BABYLON.MeshBuilder.CreateLines(
            'snapInd_srcArrow',
            { points: [src.worldPos, srcArrowEnd] },
            scene
        );
        srcArrow.color = new BABYLON.Color3(0, 0.9, 0.95);
        srcArrow.renderingGroupId = 2;
        srcArrow.isPickable = false;
        self._snapIndicators.push(srcArrow);

        var tgtArrowEnd = tgt.worldPos.add(tgt.worldNormal.scale(arrowLen));
        var tgtArrow = BABYLON.MeshBuilder.CreateLines(
            'snapInd_tgtArrow',
            { points: [tgt.worldPos, tgtArrowEnd] },
            scene
        );
        tgtArrow.color = new BABYLON.Color3(0.95, 0.2, 0.9);
        tgtArrow.renderingGroupId = 2;
        tgtArrow.isPickable = false;
        self._snapIndicators.push(tgtArrow);
    };

    /**
     * Hide/dispose all snap indicator meshes.
     * Call on drag end or when snap is no longer active.
     */
    self.hideSnapIndicator = function () {
        for (var i = 0; i < self._snapIndicators.length; i++) {
            var m = self._snapIndicators[i];
            if (m && m.dispose) {
                m.dispose();
            }
        }
        self._snapIndicators = [];
    };

    // ===========================================================================
    // 5. DEBUG / VISUALIZATION helpers
    // ===========================================================================

    /** Currently displayed debug markers */
    self._debugMarkers = [];

    /**
     * Show snap points for a component as small colored spheres in the scene.
     * Useful for debugging and testing snap point positions.
     *
     * @param {Object} component — Component to visualize
     * @param {BABYLON.Scene} scene — The BabylonJS scene
     */
    self.showSnapPoints = function (component, scene) {
        self.hideSnapPoints();

        var worldPoints = self.getWorldSnapPoints(component);

        var roleColors = {
            'surface': new BABYLON.Color3(0.2, 0.8, 0.2),  // Green
            'attach': new BABYLON.Color3(0.8, 0.6, 0.1),  // Orange
            'mount': new BABYLON.Color3(0.2, 0.5, 1.0),  // Blue
            'axle': new BABYLON.Color3(0.8, 0.2, 0.8)   // Purple
        };

        worldPoints.forEach(function (sp, i) {
            // Snap point sphere
            var marker = BABYLON.MeshBuilder.CreateSphere(
                'snapMarker_' + i, { diameter: 0.4 }, scene
            );
            marker.position = sp.worldPos;
            marker.isPickable = false;
            marker.renderingGroupId = 2;

            var mat = new BABYLON.StandardMaterial('snapMarkerMat_' + i, scene);
            var color = roleColors[sp.role] || new BABYLON.Color3(1, 1, 1);
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.5);
            mat.alpha = 0.8;
            marker.material = mat;

            // Normal arrow (short line)
            var arrowLength = 0.6;
            var arrowEnd = sp.worldPos.add(sp.worldNormal.scale(arrowLength));
            var arrow = BABYLON.MeshBuilder.CreateLines(
                'snapArrow_' + i,
                { points: [sp.worldPos, arrowEnd] },
                scene
            );
            arrow.color = color;
            arrow.renderingGroupId = 2;
            arrow.isPickable = false;

            self._debugMarkers.push(marker, arrow);
        });
    };

    /**
     * Hide all debug snap point markers
     */
    self.hideSnapPoints = function () {
        self._debugMarkers.forEach(function (m) {
            if (m && m.dispose) m.dispose();
        });
        self._debugMarkers = [];
    };

    /**
     * Log snap points for a component to console (for debugging)
     */
    self.debugLogSnapPoints = function (component) {
        var localPoints = self.getSnapPoints(component);
        var type = component.type || 'unknown';
        console.group('SnapManager: ' + type + ' snap points');
        localPoints.forEach(function (sp) {
            console.log(
                '  ' + sp.name +
                ' pos=[' + sp.localPos.join(', ') + ']' +
                ' normal=[' + sp.normal.join(', ') + ']' +
                ' role=' + sp.role
            );
        });
        console.groupEnd();
    };
    // ===========================================================================
    // 5b. PROXIMITY PREVIEW — show snap points on selection
    // ===========================================================================

    /** Proximity preview radius (cm) */
    self.PREVIEW_RADIUS = 10.0;

    /** Currently displayed preview markers */
    self._previewMarkers = [];

    /** Shared materials for preview (lazy init) */
    self._previewMats = null;

    self._ensurePreviewMats = function (scene) {
        if (self._previewMats) return;

        // Selected component's own snap points — Cyan, semi-transparent
        var ownMat = new BABYLON.StandardMaterial('snapPreview_own', scene);
        ownMat.emissiveColor = new BABYLON.Color3(0, 0.85, 0.9);
        ownMat.diffuseColor = new BABYLON.Color3(0, 0.85, 0.9);
        ownMat.alpha = 0.5;
        ownMat.disableLighting = true;

        // Nearby compatible snap points — Orange, semi-transparent
        var nearbyMat = new BABYLON.StandardMaterial('snapPreview_nearby', scene);
        nearbyMat.emissiveColor = new BABYLON.Color3(1.0, 0.65, 0.1);
        nearbyMat.diffuseColor = new BABYLON.Color3(1.0, 0.65, 0.1);
        nearbyMat.alpha = 0.45;
        nearbyMat.disableLighting = true;

        self._previewMats = { own: ownMat, nearby: nearbyMat };
    };

    /**
     * Show proximity preview: snap points on the selected component
     * and compatible nearby snap points within PREVIEW_RADIUS.
     *
     * @param {Object} selectedComponent — The selected component
     * @param {Array} allComponents — All components in the scene
     * @param {BABYLON.Scene} scene
     */
    self.showProximityPreview = function (selectedComponent, allComponents, scene) {
        self.hideProximityPreview();
        if (!self.enabled || !selectedComponent) return;

        self._ensurePreviewMats(scene);

        var ownPoints = self.getWorldSnapPoints(selectedComponent);
        if (ownPoints.length === 0) return;

        var selectedMesh = selectedComponent.body || selectedComponent;
        var ms = self.getMarkerScale(selectedMesh);
        // Body is much larger than components — reduce marker size
        if (selectedComponent.type === '__body__') ms *= 0.3;
        var previewRadius = self.PREVIEW_RADIUS * ms;

        // Show own snap points (Cyan, small)
        ownPoints.forEach(function (sp, i) {
            var marker = BABYLON.MeshBuilder.CreateSphere(
                'snapPrev_own_' + i, { diameter: 0.35 * ms, segments: 6 }, scene
            );
            marker.position = sp.worldPos.clone();
            marker.material = self._previewMats.own;
            marker.renderingGroupId = 2;
            marker.isPickable = false;

            var arrowEnd = sp.worldPos.add(sp.worldNormal.scale(0.5 * ms));
            var arrow = BABYLON.MeshBuilder.CreateLines(
                'snapPrev_ownArrow_' + i,
                { points: [sp.worldPos, arrowEnd] }, scene
            );
            arrow.color = new BABYLON.Color3(0, 0.85, 0.9);
            arrow.renderingGroupId = 2;
            arrow.isPickable = false;

            self._previewMarkers.push(marker, arrow);
        });

        // Find and show nearby compatible snap points on other components
        var nearbyIdx = 0;
        for (var c = 0; c < allComponents.length; c++) {
            var other = allComponents[c];
            if (other === selectedComponent) continue;
            if (other.body === selectedComponent.body) continue;

            var otherPoints = self.getWorldSnapPoints(other);

            for (var t = 0; t < otherPoints.length; t++) {
                var tgt = otherPoints[t];

                // Check if any own point is within scaled preview radius
                var isNearby = false;
                for (var s = 0; s < ownPoints.length; s++) {
                    var dist = BABYLON.Vector3.Distance(ownPoints[s].worldPos, tgt.worldPos);
                    if (dist <= previewRadius && SNAP_POINTS_DB.isCompatible(ownPoints[s].role, tgt.role)) {
                        isNearby = true;
                        break;
                    }
                }

                if (isNearby) {
                    var otherMesh = other.body || other;
                    var msOther = self.getMarkerScale(otherMesh);
                    if (other.type === '__body__') msOther *= 0.3;
                    var marker = BABYLON.MeshBuilder.CreateSphere(
                        'snapPrev_near_' + nearbyIdx, { diameter: 0.3 * msOther, segments: 6 }, scene
                    );
                    marker.position = tgt.worldPos.clone();
                    marker.material = self._previewMats.nearby;
                    marker.renderingGroupId = 2;
                    marker.isPickable = false;

                    var arrowEnd = tgt.worldPos.add(tgt.worldNormal.scale(0.5 * msOther));
                    var arrow = BABYLON.MeshBuilder.CreateLines(
                        'snapPrev_nearArrow_' + nearbyIdx,
                        { points: [tgt.worldPos, arrowEnd] }, scene
                    );
                    arrow.color = new BABYLON.Color3(1.0, 0.65, 0.1);
                    arrow.renderingGroupId = 2;
                    arrow.isPickable = false;

                    self._previewMarkers.push(marker, arrow);
                    nearbyIdx++;
                }
            }
        }
    };

    /**
     * Hide all proximity preview markers.
     */
    self.hideProximityPreview = function () {
        for (var i = 0; i < self._previewMarkers.length; i++) {
            var m = self._previewMarkers[i];
            if (m && m.dispose) m.dispose();
        }
        self._previewMarkers = [];
    };

    // ===========================================================================
    // 7. SHIFT BYPASS — temporarily disable snap while Shift is held
    // ===========================================================================

    /** Whether Shift key is currently held */
    self.shiftHeld = false;

    /** Install global keyboard listeners for Shift bypass */
    self._installShiftListener = function () {
        if (self._shiftListenerInstalled) return;
        self._shiftListenerInstalled = true;

        window.addEventListener('keydown', function (e) {
            if (e.key === 'Shift') self.shiftHeld = true;
        });
        window.addEventListener('keyup', function (e) {
            if (e.key === 'Shift') self.shiftHeld = false;
        });
        // Reset on blur (tab switch)
        window.addEventListener('blur', function () {
            self.shiftHeld = false;
        });
    };
    self._shiftListenerInstalled = false;
    self._installShiftListener();

    // ===========================================================================
    // 8. QUICK SNAP — Point-and-click snap mode (Q key)
    // ===========================================================================

    self.quickSnap = {
        active: false,
        point1: null,         // { worldSnapPoint, component, index }
        point2: null,
        markers: [],          // All pickable snap markers
        toolbar: null,        // HUD element
        scene: null,
        allComponents: [],
        onComplete: null,     // Callback after snap: fn(movedComponent)
        savedPickStates: []   // Saved isPickable states of scene meshes
    };

    /**
     * Enter Quick Snap mode. Shows all snap points as clickable markers.
     *
     * @param {Array} allComponents — All components in the scene
     * @param {BABYLON.Scene} scene
     * @param {Function} [onComplete] — Called after snap: fn(movedComponent)
     */
    self.enterQuickSnap = function (allComponents, scene, onComplete) {
        self.exitQuickSnap(); // Clean up any previous session

        self.quickSnap.active = true;
        self.quickSnap.scene = scene;
        self.quickSnap.allComponents = allComponents;
        self.quickSnap.onComplete = onComplete || null;
        self.quickSnap.point1 = null;
        self.quickSnap.point2 = null;

        // Create toolbar HUD
        self._createQuickSnapToolbar();

        // Disable picking on ALL existing scene meshes so snap markers can be picked
        self.quickSnap.savedPickStates = [];
        var allMeshes = scene.meshes.slice(); // Copy array
        for (var m = 0; m < allMeshes.length; m++) {
            var mesh = allMeshes[m];
            self.quickSnap.savedPickStates.push({ mesh: mesh, wasPickable: mesh.isPickable });
            mesh.isPickable = false;
        }

        // Show all snap points as pickable markers
        var markerIdx = 0;
        for (var c = 0; c < allComponents.length; c++) {
            var comp = allComponents[c];
            var worldPoints = self.getWorldSnapPoints(comp);

            for (var p = 0; p < worldPoints.length; p++) {
                var sp = worldPoints[p];
                (function (component, snapPoint, idx) {
                    var compMesh = component.body || component;
                    var ms = self.getMarkerScale(compMesh);
                    var marker = BABYLON.MeshBuilder.CreateSphere(
                        'qsnap_' + idx, { diameter: 0.45 * ms, segments: 8 }, scene
                    );
                    marker.position = snapPoint.worldPos.clone();
                    marker.renderingGroupId = 2;
                    marker.isPickable = true;

                    // Grey/dim material
                    var mat = new BABYLON.StandardMaterial('qsnap_mat_' + idx, scene);
                    mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    mat.alpha = 0.4;
                    mat.disableLighting = true;
                    marker.material = mat;

                    // Normal arrow
                    var arrowEnd = snapPoint.worldPos.add(snapPoint.worldNormal.scale(0.6 * ms));
                    var arrow = BABYLON.MeshBuilder.CreateLines(
                        'qsnap_arrow_' + idx,
                        { points: [snapPoint.worldPos, arrowEnd] }, scene
                    );
                    arrow.color = new BABYLON.Color3(0.5, 0.5, 0.5);
                    arrow.renderingGroupId = 2;
                    arrow.isPickable = false;

                    // Hover
                    var hoverMat = new BABYLON.StandardMaterial('qsnap_hover_' + idx, scene);
                    hoverMat.emissiveColor = new BABYLON.Color3(1, 0.9, 0.2);
                    hoverMat.alpha = 0.8;
                    hoverMat.disableLighting = true;

                    marker.actionManager = new BABYLON.ActionManager(scene);
                    marker.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPointerOverTrigger, function () {
                            marker.material = hoverMat;
                        }
                    ));
                    marker.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPointerOutTrigger, function () {
                            // Restore to appropriate state color
                            if (self.quickSnap.point1 && self.quickSnap.point1.marker === marker) return;
                            marker.material = mat;
                        }
                    ));

                    // Click handler
                    marker.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPickTrigger, function () {
                            self._onQuickSnapClick(component, snapPoint, marker, mat);
                        }
                    ));

                    self.quickSnap.markers.push({
                        marker: marker, arrow: arrow, mat: mat, hoverMat: hoverMat,
                        component: component, snapPoint: snapPoint
                    });
                })(comp, sp, markerIdx++);
            }
        }
    };

    /**
     * Handle click on a snap point during Quick Snap.
     */
    self._onQuickSnapClick = function (component, snapPoint, marker, originalMat) {
        if (!self.quickSnap.point1) {
            // Selecting Point 1 (source — the component that will MOVE)
            var selectedMat = new BABYLON.StandardMaterial('qsnap_sel1', self.quickSnap.scene);
            selectedMat.emissiveColor = new BABYLON.Color3(0, 0.9, 0.95);
            selectedMat.alpha = 0.9;
            selectedMat.disableLighting = true;
            marker.material = selectedMat;

            self.quickSnap.point1 = {
                component: component, snapPoint: snapPoint,
                marker: marker, selectedMat: selectedMat, originalMat: originalMat
            };
            self._updateQuickSnapToolbar();
        } else if (self.quickSnap.point1.marker === marker) {
            // Clicking the same point again — deselect
            marker.material = originalMat;
            self.quickSnap.point1 = null;
            self._updateQuickSnapToolbar();
        } else {
            // Selecting Point 2 (target — the component that stays)
            // Don't allow selecting two points on the same component
            if (component === self.quickSnap.point1.component ||
                (component.body && component.body === self.quickSnap.point1.component.body)) {
                return; // Same component, ignore
            }

            self.quickSnap.point2 = {
                component: component, snapPoint: snapPoint
            };

            // Execute snap!
            self._executeQuickSnap();
        }
    };

    /**
     * Execute the Quick Snap: move + rotate Point1's component to align with Point2.
     * Position + Rotation alignment (Option B).
     */
    self._executeQuickSnap = function () {
        var p1 = self.quickSnap.point1;
        var p2 = self.quickSnap.point2;
        if (!p1 || !p2) return;

        var srcSP = p1.snapPoint;
        var tgtSP = p2.snapPoint;
        var mesh = p1.component.body;
        if (!mesh) { self.exitQuickSnap(); return; }

        // Step 1: Compute rotation to align source normal to OPPOSE target normal
        var srcNormal = srcSP.worldNormal.clone();
        var tgtNormal = tgtSP.worldNormal.clone();
        var desiredNormal = tgtNormal.negate(); // We want src normal to point opposite to target

        var rotQuat = self._quaternionFromTo(srcNormal, desiredNormal);

        // Apply rotation to mesh
        if (!mesh.rotationQuaternion) {
            mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(mesh.rotation);
        }
        mesh.rotationQuaternion = rotQuat.multiply(mesh.rotationQuaternion);
        mesh.computeWorldMatrix(true);

        // Step 2: After rotation, recalculate source snap point position
        var newSrcWorld = self.toWorldSpace(
            { localPos: srcSP.localPos, normal: srcSP.normal, name: srcSP.name, role: srcSP.role },
            mesh
        );

        // Step 3: Translate to align positions
        var offset = tgtSP.worldPos.subtract(newSrcWorld.worldPos);
        mesh.position.addInPlace(offset);
        mesh.computeWorldMatrix(true);

        // Done — save callback before exit clears state
        var movedComponent = p1.component;
        var callback = self.quickSnap.onComplete;
        self.exitQuickSnap();

        if (callback) {
            callback(movedComponent);
        }
    };

    /**
     * Compute quaternion that rotates vector 'from' to vector 'to'.
     */
    self._quaternionFromTo = function (from, to) {
        var f = from.normalize();
        var t = to.normalize();
        var dot = BABYLON.Vector3.Dot(f, t);

        if (dot > 0.999999) {
            // Already aligned
            return BABYLON.Quaternion.Identity();
        }
        if (dot < -0.999999) {
            // Opposite — rotate 180° around any perpendicular axis
            var perp = BABYLON.Vector3.Cross(BABYLON.Axis.X, f);
            if (perp.length() < 0.001) perp = BABYLON.Vector3.Cross(BABYLON.Axis.Y, f);
            perp.normalize();
            return BABYLON.Quaternion.RotationAxis(perp, Math.PI);
        }

        var cross = BABYLON.Vector3.Cross(f, t);
        var w = 1 + dot;
        var q = new BABYLON.Quaternion(cross.x, cross.y, cross.z, w);
        q.normalize();
        return q;
    };

    /**
     * Create the Quick Snap toolbar overlay.
     */
    self._createQuickSnapToolbar = function () {
        // Create a floating div overlay
        var toolbar = document.createElement('div');
        toolbar.id = 'quickSnapToolbar';
        toolbar.style.cssText = 'position:fixed; top:60px; left:50%; transform:translateX(-50%); ' +
            'background:rgba(0,0,0,0.85); border:2px solid #0dd; border-radius:10px; padding:10px 20px; ' +
            'z-index:10000; display:flex; align-items:center; gap:15px; font-family:sans-serif; color:white; font-size:14px;';

        toolbar.innerHTML =
            '<span style="font-weight:bold; color:#0dd;">⚡ Quick Snap</span>' +
            '<div id="qsnap_slot1" style="display:flex; align-items:center; gap:5px;">' +
            '  <span style="width:16px; height:16px; border-radius:50%; border:2px solid #666; display:inline-block; background:transparent;" id="qsnap_dot1"></span>' +
            '  <span id="qsnap_label1" style="color:#999;">Point 1</span>' +
            '</div>' +
            '<span style="color:#666;">→</span>' +
            '<div id="qsnap_slot2" style="display:flex; align-items:center; gap:5px;">' +
            '  <span style="width:16px; height:16px; border-radius:50%; border:2px solid #666; display:inline-block; background:transparent;" id="qsnap_dot2"></span>' +
            '  <span id="qsnap_label2" style="color:#999;">Point 2</span>' +
            '</div>' +
            '<button id="qsnap_cancel" style="background:#333; border:1px solid #666; color:#ccc; padding:4px 12px; border-radius:5px; cursor:pointer; margin-left:10px;">Esc</button>';

        document.body.appendChild(toolbar);

        // Cancel button
        document.getElementById('qsnap_cancel').addEventListener('click', function () {
            self.exitQuickSnap();
        });

        self.quickSnap.toolbar = toolbar;
    };

    /**
     * Update the Quick Snap toolbar to reflect current state.
     */
    self._updateQuickSnapToolbar = function () {
        var dot1 = document.getElementById('qsnap_dot1');
        var label1 = document.getElementById('qsnap_label1');

        if (self.quickSnap.point1) {
            dot1.style.background = '#0dd';
            dot1.style.borderColor = '#0dd';
            var name1 = self.quickSnap.point1.snapPoint.name || 'selected';
            label1.textContent = name1;
            label1.style.color = '#0dd';
        } else {
            dot1.style.background = 'transparent';
            dot1.style.borderColor = '#666';
            label1.textContent = 'Point 1';
            label1.style.color = '#999';
        }
    };

    /**
     * Exit Quick Snap mode. Dispose all markers and toolbar.
     */
    self.exitQuickSnap = function () {
        // Dispose markers
        for (var i = 0; i < self.quickSnap.markers.length; i++) {
            var m = self.quickSnap.markers[i];
            if (m.marker && m.marker.dispose) m.marker.dispose();
            if (m.arrow && m.arrow.dispose) m.arrow.dispose();
            if (m.mat && m.mat.dispose) m.mat.dispose();
            if (m.hoverMat && m.hoverMat.dispose) m.hoverMat.dispose();
        }
        if (self.quickSnap.point1 && self.quickSnap.point1.selectedMat) {
            self.quickSnap.point1.selectedMat.dispose();
        }
        self.quickSnap.markers = [];

        // Remove toolbar
        if (self.quickSnap.toolbar) {
            self.quickSnap.toolbar.remove();
            self.quickSnap.toolbar = null;
        }

        // Restore picking on scene meshes
        for (var i = 0; i < self.quickSnap.savedPickStates.length; i++) {
            var entry = self.quickSnap.savedPickStates[i];
            if (entry.mesh && !entry.mesh.isDisposed()) {
                entry.mesh.isPickable = entry.wasPickable;
            }
        }
        self.quickSnap.savedPickStates = [];

        self.quickSnap.active = false;
        self.quickSnap.point1 = null;
        self.quickSnap.point2 = null;
    };

    /**
     * Install Q key listener for Quick Snap toggle.
     * Must be called by the host page, passing allComponents supplier and scene.
     *
     * @param {Function} getComponents — fn() returns array of components
     * @param {BABYLON.Scene} scene
     * @param {Function} [onComplete] — Called after snap: fn(movedComponent)
     */
    self.installQuickSnapKey = function (getComponents, scene, onComplete) {
        window.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'q' || e.key === 'Q') {
                if (self.quickSnap.active) {
                    self.exitQuickSnap();
                } else {
                    self.enterQuickSnap(getComponents(), scene, onComplete);
                }
            }
            if (e.key === 'Escape' && self.quickSnap.active) {
                self.exitQuickSnap();
            }
        });
    };

    return self;
})();
