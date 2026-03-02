/**
 * CustomGizmo — Position, Rotation & Scale manipulation gizmo
 * Supports five modes:
 *   - 'moveFree':  click & drag object directly for free movement (camera-facing plane)
 *   - 'movePlane': arrows where each axis constrains to the perpendicular plane
 *   - 'move':      arrows constrained to a single axis
 *   - 'rotate':    colored torus rings for rotation around each axis
 *   - 'scale':     colored axis lines with cube handles for scaling
 * Descartes coordinate mapping: BJS X=X, BJS Y=Z, BJS Z=Y
 */
function CustomGizmo(scene) {
    var self = this;
    this.scene = scene;
    this.arrows = {};   // move/movePlane mode: axis arrows
    this.rings = {};    // rotate mode elements
    this.scaleHandles = {}; // scale mode elements
    this.freeDragBehavior = null; // moveFree mode: PointerDragBehavior on target mesh
    this.rootNode = null;
    this.targetMesh = null;
    this.isActive = false;
    this.mode = 'move'; // 'moveFree', 'movePlane', 'move', 'rotate', 'scale'

    // Callbacks
    this.onDragStartCb = null;
    this.onDragEndCb = null;
    this.onSnapCheckCb = null;  // Called during move-mode drag: fn(mesh) → {snapOffset} or null

    // Config — Move
    var SHAFT_LENGTH = 0.8;
    var SHAFT_RADIUS = 0.024;
    var CONE_HEIGHT = 0.2;
    var CONE_RADIUS = 0.07;
    var SCALE_FACTOR = 0.24;
    // (plane handles and center sphere removed — now handled by toolbar modes)

    // Config — Rotate
    var TORUS_DIAMETER = 1.6;
    var TORUS_THICKNESS = 0.03;
    var TORUS_TESSELLATION = 32;

    // Config — Scale
    var SCALE_LINE_LENGTH = 0.8;
    var SCALE_LINE_RADIUS = 0.018;
    var SCALE_CUBE_SIZE = 0.1;

    var COLORS = {
        x: new BABYLON.Color3(0.9, 0.2, 0.2),
        y: new BABYLON.Color3(0.2, 0.75, 0.2),
        z: new BABYLON.Color3(0.3, 0.4, 0.95)
    };
    var HOVER_COLOR = new BABYLON.Color3(1, 0.85, 0.1);

    // Descartes axis labels: BJS X=Descartes X, BJS Y=Descartes Z, BJS Z=Descartes Y
    var DESCARTES_LABELS = { x: 'X', y: 'Z', z: 'Y' };
    var LABEL_HEX = { x: '#E63333', y: '#33BF33', z: '#4D66F2' };

    /**
     * Attach gizmo to a mesh
     * @param {BABYLON.Mesh} mesh
     * @param {object} opts - { onDragStart, onDragEnd, mode }
     *   mode: 'move' (default), 'rotate', or 'scale'
     */
    this.attach = function (mesh, opts) {
        self.detach();
        if (!mesh) return;

        opts = opts || {};
        self.targetMesh = mesh;
        self.mode = opts.mode || 'move';
        self.scaleFactor = opts.scaleFactor || SCALE_FACTOR;
        self.onDragStartCb = opts.onDragStart || null;
        self.onDragEndCb = opts.onDragEnd || null;
        self.onSnapCheckCb = opts.onSnapCheck || null;

        self.rootNode = new BABYLON.TransformNode('gizmoRoot', scene);
        mesh.computeWorldMatrix(true);
        self.rootNode.position.copyFrom(mesh.absolutePosition);

        // Ensure gizmo renders on top
        scene.setRenderingAutoClearDepthStencil(2, true, true, false);

        // BabylonJS axes: X=right, Y=up, Z=forward
        if (self.mode === 'rotate') {
            self._createRing('x', COLORS.x, new BABYLON.Vector3(1, 0, 0));
            self._createRing('y', COLORS.y, new BABYLON.Vector3(0, 1, 0));
            self._createRing('z', COLORS.z, new BABYLON.Vector3(0, 0, 1));
        } else if (self.mode === 'scale') {
            self._createScaleHandle('x', COLORS.x, new BABYLON.Vector3(1, 0, 0));
            self._createScaleHandle('y', COLORS.y, new BABYLON.Vector3(0, 1, 0));
            self._createScaleHandle('z', COLORS.z, new BABYLON.Vector3(0, 0, 1));
        } else if (self.mode === 'moveFree') {
            // Free drag: attach directly to target mesh, no gizmo visual
            self._createFreeDrag();
        } else if (self.mode === 'movePlane') {
            // Plane drag: arrows but each axis -> perpendicular plane
            self._createArrow('x', COLORS.x, new BABYLON.Vector3(1, 0, 0), true);
            self._createArrow('y', COLORS.y, new BABYLON.Vector3(0, 1, 0), true);
            self._createArrow('z', COLORS.z, new BABYLON.Vector3(0, 0, 1), true);
        } else {
            // Axis move: arrows constrained to single axis
            self._createArrow('x', COLORS.x, new BABYLON.Vector3(1, 0, 0), false);
            self._createArrow('y', COLORS.y, new BABYLON.Vector3(0, 1, 0), false);
            self._createArrow('z', COLORS.z, new BABYLON.Vector3(0, 0, 1), false);
        }

        self.isActive = true;
        self.update();
    };

    // ===================== MOVE MODE: Arrows =====================

    /**
     * Create an arrow handle for move or movePlane mode.
     * @param {string} axisName
     * @param {BABYLON.Color3} color
     * @param {BABYLON.Vector3} axisDir
     * @param {boolean} [usePlaneDrag] — if true, drag on plane perpendicular to axis
     */
    this._createArrow = function (axisName, color, axisDir, usePlaneDrag) {
        var mat = new BABYLON.StandardMaterial('gizmoMat_' + axisName, scene);
        mat.emissiveColor = color;
        mat.disableLighting = true;

        var hoverMat = new BABYLON.StandardMaterial('gizmoHover_' + axisName, scene);
        hoverMat.emissiveColor = HOVER_COLOR;
        hoverMat.disableLighting = true;

        // Arrow group
        var arrowNode = new BABYLON.TransformNode('gizmoArrow_' + axisName, scene);
        arrowNode.parent = self.rootNode;

        // Shaft
        var shaft = BABYLON.MeshBuilder.CreateCylinder('gizmoShaft_' + axisName, {
            height: SHAFT_LENGTH, diameter: SHAFT_RADIUS * 2, tessellation: 8
        }, scene);
        shaft.material = mat;
        shaft.parent = arrowNode;
        shaft.renderingGroupId = 2;
        shaft.position.y = SHAFT_LENGTH / 2;

        // Cone head
        var cone = BABYLON.MeshBuilder.CreateCylinder('gizmoCone_' + axisName, {
            height: CONE_HEIGHT, diameterTop: 0, diameterBottom: CONE_RADIUS * 2, tessellation: 8
        }, scene);
        cone.material = mat;
        cone.parent = arrowNode;
        cone.renderingGroupId = 2;
        cone.position.y = SHAFT_LENGTH + CONE_HEIGHT / 2;
        cone.isPickable = false;

        // Axis label at the tip
        var labelPlane = self._createLabel(axisName, LABEL_HEX[axisName], axisDir);

        // Orient arrow along axis
        if (axisName === 'x') {
            arrowNode.rotation.z = -Math.PI / 2;
        } else if (axisName === 'z') {
            arrowNode.rotation.x = Math.PI / 2;
        }

        // Drag behavior: axis-constrained or plane-constrained
        var dragBehavior = usePlaneDrag
            ? new BABYLON.PointerDragBehavior({ dragPlaneNormal: axisDir })
            : new BABYLON.PointerDragBehavior({ dragAxis: axisDir });
        dragBehavior.useObjectOrientationForDragging = false;
        dragBehavior.moveAttached = false;

        // Snap state tracking for breakaway
        var _snapState = {
            isSnapped: false,       // Currently locked to a snap point
            coolingDown: false,     // After breakaway, blocks re-snap until out of range
            accumDrag: 0,           // Accumulated drag distance while snapped
            breakawayThreshold: 2.0 // Distance to drag before breaking free
        };

        dragBehavior.onDragStartObservable.add(function () {
            shaft.material = hoverMat;
            cone.material = hoverMat;
            _snapState.isSnapped = false;
            _snapState.coolingDown = false;
            _snapState.accumDrag = 0;
            if (self.onDragStartCb) self.onDragStartCb(axisName);
        });

        dragBehavior.onDragObservable.add(function (event) {
            var delta = event.delta;

            // In plane mode, enforce constraint: remove any drift along the plane normal
            if (usePlaneDrag) {
                var dot = BABYLON.Vector3.Dot(delta, axisDir);
                delta = delta.subtract(axisDir.scale(dot));
            }

            if (self.targetMesh.parent) {
                var matrix = self.targetMesh.parent.getWorldMatrix().clone().invert();
                matrix.setTranslation(BABYLON.Vector3.Zero());
                delta = BABYLON.Vector3.TransformCoordinates(delta, matrix);
            }
            self.targetMesh.position.addInPlace(delta);

            // Magnetic snap check (all move modes)
            if ((self.mode === 'move' || self.mode === 'movePlane') && self.onSnapCheckCb) {
                var shiftBypass = (typeof SnapManager !== 'undefined' && SnapManager.shiftHeld);

                // Helper: in plane mode, project snap offset onto the drag plane
                var constrainOffset = function (offset) {
                    if (usePlaneDrag && offset) {
                        var d = BABYLON.Vector3.Dot(offset, axisDir);
                        return offset.subtract(axisDir.scale(d));
                    }
                    return offset;
                };

                if (_snapState.isSnapped) {
                    // Currently snapped — check for breakaway
                    _snapState.accumDrag += delta.length();
                    if (_snapState.accumDrag > _snapState.breakawayThreshold || shiftBypass) {
                        // Break free!
                        _snapState.isSnapped = false;
                        _snapState.coolingDown = true; // Block re-snap
                        _snapState.accumDrag = 0;
                        if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                    } else {
                        // Still snapped — re-apply
                        var snapResult = self.onSnapCheckCb(self.targetMesh);
                        if (snapResult && snapResult.snapOffset) {
                            var so = constrainOffset(snapResult.snapOffset);
                            if (self.targetMesh.parent) {
                                var invP = self.targetMesh.parent.getWorldMatrix().clone().invert();
                                invP.setTranslation(BABYLON.Vector3.Zero());
                                self.targetMesh.position.addInPlace(
                                    BABYLON.Vector3.TransformCoordinates(so, invP)
                                );
                            } else {
                                self.targetMesh.position.addInPlace(so);
                            }
                            if (typeof SnapManager !== 'undefined') {
                                SnapManager.showSnapIndicator(snapResult, scene);
                            }
                        } else {
                            _snapState.isSnapped = false;
                            _snapState.accumDrag = 0;
                            if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                        }
                    }
                } else if (_snapState.coolingDown) {
                    // Cooling down after breakaway — wait until out of snap range
                    var checkResult = self.onSnapCheckCb(self.targetMesh);
                    if (!checkResult) {
                        // Out of range — cooldown complete, allow re-snap
                        _snapState.coolingDown = false;
                    }
                    if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                } else if (!shiftBypass) {
                    // Free — look for new snap
                    var snapResult = self.onSnapCheckCb(self.targetMesh);
                    if (snapResult && snapResult.snapOffset) {
                        _snapState.isSnapped = true;
                        _snapState.accumDrag = 0;
                        var so = constrainOffset(snapResult.snapOffset);
                        if (self.targetMesh.parent) {
                            var invParent = self.targetMesh.parent.getWorldMatrix().clone().invert();
                            invParent.setTranslation(BABYLON.Vector3.Zero());
                            self.targetMesh.position.addInPlace(
                                BABYLON.Vector3.TransformCoordinates(so, invParent)
                            );
                        } else {
                            self.targetMesh.position.addInPlace(so);
                        }
                        if (typeof SnapManager !== 'undefined') {
                            SnapManager.showSnapIndicator(snapResult, scene);
                        }
                    } else {
                        if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                    }
                } else {
                    if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                }
            }

            self.update();
        });

        dragBehavior.onDragEndObservable.add(function () {
            shaft.material = mat;
            cone.material = mat;
            _snapState.isSnapped = false;
            _snapState.coolingDown = false;
            _snapState.accumDrag = 0;
            if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
            if (self.onDragEndCb) self.onDragEndCb(axisName, self.targetMesh.position.clone());
        });

        shaft.addBehavior(dragBehavior);
        shaft.isPickable = true;

        // Hover effects
        shaft.actionManager = new BABYLON.ActionManager(scene);
        shaft.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger, function () {
                if (!dragBehavior.dragging) { shaft.material = hoverMat; cone.material = hoverMat; }
            }));
        shaft.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger, function () {
                if (!dragBehavior.dragging) { shaft.material = mat; cone.material = mat; }
            }));

        self.arrows[axisName] = { node: arrowNode, shaft: shaft, cone: cone, labelPlane: labelPlane, mat: mat, hoverMat: hoverMat, drag: dragBehavior };
    };

    // ===================== MOVE FREE MODE: Direct mesh drag =====================

    /**
     * Attach a free-drag behavior directly to the target mesh.
     * No gizmo visual is created — user clicks and drags the object itself.
     */
    this._createFreeDrag = function () {
        var dragBehavior = new BABYLON.PointerDragBehavior({});
        dragBehavior.useObjectOrientationForDragging = false;
        dragBehavior.moveAttached = false;

        var _snapState = { isSnapped: false, coolingDown: false, accumDrag: 0, breakawayThreshold: 2.0 };

        dragBehavior.onDragStartObservable.add(function () {
            if (scene.activeCamera) scene.activeCamera.detachControl();
            _snapState.isSnapped = false; _snapState.coolingDown = false; _snapState.accumDrag = 0;
            if (self.onDragStartCb) self.onDragStartCb('free');
        });

        dragBehavior.onDragObservable.add(function (event) {
            var delta = event.delta;
            if (self.targetMesh.parent) {
                var matrix = self.targetMesh.parent.getWorldMatrix().clone().invert();
                matrix.setTranslation(BABYLON.Vector3.Zero());
                delta = BABYLON.Vector3.TransformCoordinates(delta, matrix);
            }
            self.targetMesh.position.addInPlace(delta);

            // Snap check
            if (self.onSnapCheckCb) {
                var shiftBypass = (typeof SnapManager !== 'undefined' && SnapManager.shiftHeld);
                if (_snapState.isSnapped) {
                    _snapState.accumDrag += delta.length();
                    if (_snapState.accumDrag > _snapState.breakawayThreshold || shiftBypass) {
                        _snapState.isSnapped = false; _snapState.coolingDown = true; _snapState.accumDrag = 0;
                        if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                    } else {
                        var sr = self.onSnapCheckCb(self.targetMesh);
                        if (sr && sr.snapOffset) {
                            if (self.targetMesh.parent) {
                                var inv = self.targetMesh.parent.getWorldMatrix().clone().invert();
                                inv.setTranslation(BABYLON.Vector3.Zero());
                                self.targetMesh.position.addInPlace(BABYLON.Vector3.TransformCoordinates(sr.snapOffset, inv));
                            } else { self.targetMesh.position.addInPlace(sr.snapOffset); }
                            if (typeof SnapManager !== 'undefined') SnapManager.showSnapIndicator(sr, scene);
                        } else { _snapState.isSnapped = false; _snapState.accumDrag = 0; if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator(); }
                    }
                } else if (_snapState.coolingDown) {
                    if (!self.onSnapCheckCb(self.targetMesh)) _snapState.coolingDown = false;
                    if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
                } else if (!shiftBypass) {
                    var sr = self.onSnapCheckCb(self.targetMesh);
                    if (sr && sr.snapOffset) {
                        _snapState.isSnapped = true; _snapState.accumDrag = 0;
                        if (self.targetMesh.parent) {
                            var inv = self.targetMesh.parent.getWorldMatrix().clone().invert();
                            inv.setTranslation(BABYLON.Vector3.Zero());
                            self.targetMesh.position.addInPlace(BABYLON.Vector3.TransformCoordinates(sr.snapOffset, inv));
                        } else { self.targetMesh.position.addInPlace(sr.snapOffset); }
                        if (typeof SnapManager !== 'undefined') SnapManager.showSnapIndicator(sr, scene);
                    } else { if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator(); }
                } else { if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator(); }
            }
        });

        dragBehavior.onDragEndObservable.add(function () {
            if (scene.activeCamera) scene.activeCamera.attachControl();
            _snapState.isSnapped = false; _snapState.coolingDown = false; _snapState.accumDrag = 0;
            if (typeof SnapManager !== 'undefined') SnapManager.hideSnapIndicator();
            if (self.onDragEndCb) self.onDragEndCb('free', self.targetMesh.position.clone());
        });

        self.targetMesh.addBehavior(dragBehavior);
        self.freeDragBehavior = dragBehavior;
    };

    // ===================== ROTATE MODE: Torus Rings =====================

    this._createRing = function (axisName, color, axisDir) {
        var mat = new BABYLON.StandardMaterial('gizmoRingMat_' + axisName, scene);
        mat.emissiveColor = color;
        mat.disableLighting = true;
        mat.backFaceCulling = false;

        var hoverMat = new BABYLON.StandardMaterial('gizmoRingHover_' + axisName, scene);
        hoverMat.emissiveColor = HOVER_COLOR;
        hoverMat.disableLighting = true;
        hoverMat.backFaceCulling = false;

        // Ring group
        var ringNode = new BABYLON.TransformNode('gizmoRing_' + axisName, scene);
        ringNode.parent = self.rootNode;

        // Torus ring
        var torus = BABYLON.MeshBuilder.CreateTorus('gizmoTorus_' + axisName, {
            diameter: TORUS_DIAMETER,
            thickness: TORUS_THICKNESS,
            tessellation: TORUS_TESSELLATION
        }, scene);
        torus.material = mat;
        torus.parent = ringNode;
        torus.renderingGroupId = 2;

        // Orient ring: torus by default lies in XZ plane (around Y axis)
        // X-ring: rotate so it lies in YZ plane (around X axis) → rotate Z by 90°
        // Z-ring: rotate so it lies in XY plane (around Z axis) → rotate X by 90°
        if (axisName === 'x') {
            ringNode.rotation.z = Math.PI / 2;
        } else if (axisName === 'z') {
            ringNode.rotation.x = Math.PI / 2;
        }

        // Axis label at the ring edge
        var labelPlane = self._createLabel(axisName, LABEL_HEX[axisName], axisDir);

        // Rotation drag: use plane drag perpendicular to the axis,
        // then compute angle from pointer displacement
        var dragPlaneNormal = axisDir.clone();
        var dragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: dragPlaneNormal });
        dragBehavior.useObjectOrientationForDragging = false;
        dragBehavior.moveAttached = false;

        var startAngle = 0;
        var accumulatedRotation = 0;

        dragBehavior.onDragStartObservable.add(function (event) {
            torus.material = hoverMat;
            accumulatedRotation = 0;

            // Calculate initial angle from gizmo center to pointer
            var pointerPos = event.dragPlanePoint;
            var center = self.rootNode.position;
            var toPointer = pointerPos.subtract(center);
            startAngle = self._getAngleOnPlane(toPointer, axisDir);

            if (self.onDragStartCb) self.onDragStartCb(axisName);
        });

        dragBehavior.onDragObservable.add(function (event) {
            var pointerPos = event.dragPlanePoint;
            var center = self.rootNode.position;
            var toPointer = pointerPos.subtract(center);
            var currentAngle = self._getAngleOnPlane(toPointer, axisDir);

            var deltaAngle = currentAngle - startAngle;

            // Handle wrapping around ±PI
            if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
            if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

            startAngle = currentAngle;
            accumulatedRotation += deltaAngle;

            // Apply rotation to target mesh (Right-Hand Rule: negate for BJS left-hand)
            if (self.targetMesh.rotationQuaternion) {
                var quat = BABYLON.Quaternion.RotationAxis(axisDir, -deltaAngle);
                self.targetMesh.rotationQuaternion = quat.multiply(self.targetMesh.rotationQuaternion);
            } else {
                // Apply to euler rotation
                if (axisName === 'x') self.targetMesh.rotation.x -= deltaAngle;
                else if (axisName === 'y') self.targetMesh.rotation.y -= deltaAngle;
                else if (axisName === 'z') self.targetMesh.rotation.z -= deltaAngle;
            }

            self.update();
        });

        dragBehavior.onDragEndObservable.add(function () {
            torus.material = mat;
            // Report the target mesh's current rotation
            var rot = self.targetMesh.rotationQuaternion
                ? self.targetMesh.rotationQuaternion.toEulerAngles()
                : self.targetMesh.rotation.clone();
            if (self.onDragEndCb) self.onDragEndCb(axisName, rot);
        });

        torus.addBehavior(dragBehavior);
        torus.isPickable = true;

        // Hover effects
        torus.actionManager = new BABYLON.ActionManager(scene);
        torus.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger, function () {
                if (!dragBehavior.dragging) { torus.material = hoverMat; }
            }));
        torus.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger, function () {
                if (!dragBehavior.dragging) { torus.material = mat; }
            }));

        self.rings[axisName] = { node: ringNode, torus: torus, labelPlane: labelPlane, mat: mat, hoverMat: hoverMat, drag: dragBehavior };
    };

    // ===================== SCALE MODE: Cube Handles =====================

    this._createScaleHandle = function (axisName, color, axisDir) {
        var mat = new BABYLON.StandardMaterial('gizmoScaleMat_' + axisName, scene);
        mat.emissiveColor = color;
        mat.disableLighting = true;

        var hoverMat = new BABYLON.StandardMaterial('gizmoScaleHoverMat_' + axisName, scene);
        hoverMat.emissiveColor = HOVER_COLOR;
        hoverMat.disableLighting = true;

        var handleNode = new BABYLON.TransformNode('scaleNode_' + axisName, scene);
        handleNode.parent = self.rootNode;

        // Thin line along axis
        var line = BABYLON.MeshBuilder.CreateCylinder('scaleLine_' + axisName, {
            height: SCALE_LINE_LENGTH,
            diameter: SCALE_LINE_RADIUS * 2,
            tessellation: 8
        }, scene);
        line.material = mat;
        line.parent = handleNode;
        line.renderingGroupId = 2;
        line.isPickable = false;

        // Orient line along axisDir
        if (axisDir.x === 1) {
            line.rotation.z = -Math.PI / 2;
            line.position.x = SCALE_LINE_LENGTH / 2;
        } else if (axisDir.y === 1) {
            line.position.y = SCALE_LINE_LENGTH / 2;
        } else {
            line.rotation.x = Math.PI / 2;
            line.position.z = SCALE_LINE_LENGTH / 2;
        }

        // Cube at the tip
        var cube = BABYLON.MeshBuilder.CreateBox('scaleCube_' + axisName, {
            size: SCALE_CUBE_SIZE
        }, scene);
        cube.material = mat;
        cube.parent = handleNode;
        cube.renderingGroupId = 2;

        // Position cube at end of line
        cube.position = axisDir.scale(SCALE_LINE_LENGTH);

        // Label
        var labelPlane = self._createLabel(axisName, LABEL_HEX[axisName], axisDir);
        if (labelPlane) {
            labelPlane.parent = handleNode;
            var labelOffset = 1.1;
            labelPlane.position = axisDir.scale(SCALE_LINE_LENGTH + SCALE_CUBE_SIZE * labelOffset);
        }

        // Drag behavior — constrained to axis
        var dragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: axisDir });
        dragBehavior.useObjectOrientationForDragging = false;
        dragBehavior.moveAttached = false;

        var initialScale = null;
        var dragStartPos = null;

        dragBehavior.onDragStartObservable.add(function (event) {
            cube.material = hoverMat;
            // Capture initial mesh scaling
            initialScale = self.targetMesh.scaling.clone();
            dragStartPos = event.dragPlanePoint.clone();
            if (self.onDragStartCb) self.onDragStartCb(axisName);
        });

        dragBehavior.onDragObservable.add(function (event) {
            // Calculate scale delta from drag displacement along axis
            var delta = BABYLON.Vector3.Dot(event.delta, axisDir);
            // Scale sensitivity: normalize by gizmo's visual size
            var cam = scene.activeCamera;
            var dist = BABYLON.Vector3.Distance(cam.position, self.rootNode.position);
            var gizmoScale = Math.min(Math.max(dist * SCALE_FACTOR, 0.5), 15);
            var scaleFactor = delta / (SCALE_LINE_LENGTH * gizmoScale);

            // Apply scale change to target mesh
            if (axisDir.x === 1) self.targetMesh.scaling.x += scaleFactor;
            else if (axisDir.y === 1) self.targetMesh.scaling.y += scaleFactor;
            else self.targetMesh.scaling.z += scaleFactor;

            // Clamp minimum scale
            self.targetMesh.scaling.x = Math.max(self.targetMesh.scaling.x, 0.01);
            self.targetMesh.scaling.y = Math.max(self.targetMesh.scaling.y, 0.01);
            self.targetMesh.scaling.z = Math.max(self.targetMesh.scaling.z, 0.01);
        });

        dragBehavior.onDragEndObservable.add(function () {
            cube.material = mat;
            // Report the target mesh's current scaling
            var scl = self.targetMesh.scaling.clone();
            if (self.onDragEndCb) self.onDragEndCb(axisName, scl);
        });

        cube.addBehavior(dragBehavior);
        cube.isPickable = true;

        // Hover effects
        cube.actionManager = new BABYLON.ActionManager(scene);
        cube.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger, function () {
                if (!dragBehavior.dragging) { cube.material = hoverMat; }
            }));
        cube.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger, function () {
                if (!dragBehavior.dragging) { cube.material = mat; }
            }));

        self.scaleHandles[axisName] = { node: handleNode, line: line, cube: cube, labelPlane: labelPlane, mat: mat, hoverMat: hoverMat, drag: dragBehavior };
    };

    /** Calculate angle of a vector projected onto a plane defined by its normal */
    this._getAngleOnPlane = function (vector, planeNormal) {
        // Create orthonormal basis on the plane
        var up = Math.abs(planeNormal.y) < 0.99
            ? new BABYLON.Vector3(0, 1, 0)
            : new BABYLON.Vector3(1, 0, 0);
        var right = BABYLON.Vector3.Cross(up, planeNormal).normalize();
        var forward = BABYLON.Vector3.Cross(planeNormal, right).normalize();

        var x = BABYLON.Vector3.Dot(vector, right);
        var y = BABYLON.Vector3.Dot(vector, forward);

        return Math.atan2(y, x);
    };

    // ===================== SHARED: Label Creation =====================

    this._createLabel = function (axisName, color, axisDir) {
        var labelText = DESCARTES_LABELS[axisName];
        var labelSize = 0.3;
        var labelPlane = BABYLON.MeshBuilder.CreatePlane('gizmoLabel_' + axisName, { size: labelSize }, scene);
        var labelTex = new BABYLON.DynamicTexture('gizmoLabelTex_' + axisName, { width: 64, height: 64 }, scene, false);
        labelTex.hasAlpha = true;
        labelTex.drawText(labelText, 14, 48, 'bold 48px Arial', LABEL_HEX[axisName], 'transparent', true);
        var labelMat = new BABYLON.StandardMaterial('gizmoLabelMat_' + axisName, scene);
        labelMat.diffuseTexture = labelTex;
        labelMat.emissiveColor = BABYLON.Color3.FromHexString(color);
        labelMat.disableLighting = true;
        labelMat.useAlphaFromDiffuseTexture = true;
        labelMat.backFaceCulling = false;
        labelPlane.material = labelMat;
        labelPlane.parent = self.rootNode;
        labelPlane.renderingGroupId = 2;
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Position label at the tip of the arrow / edge of the ring
        var tipOffset = (self.mode === 'rotate')
            ? (TORUS_DIAMETER / 2 + 0.15)
            : (SHAFT_LENGTH + CONE_HEIGHT + 0.15);
        labelPlane.position = axisDir.scale(tipOffset);
        labelPlane.isPickable = false;

        // Store references for cleanup
        labelPlane._gizmoTex = labelTex;
        labelPlane._gizmoMat = labelMat;

        return labelPlane;
    };

    // ===================== Update & Lifecycle =====================

    /** Update gizmo position and scale (call in render loop) */
    this.update = function () {
        if (!self.rootNode || !self.targetMesh) return;
        self.targetMesh.computeWorldMatrix(true);
        self.rootNode.position.copyFrom(self.targetMesh.absolutePosition);

        var cam = scene.activeCamera;
        var dist = BABYLON.Vector3.Distance(cam.position, self.rootNode.position);
        var sf = self.scaleFactor || SCALE_FACTOR;
        var scale = Math.min(Math.max(dist * sf, 0.5), 15);
        self.rootNode.scaling.set(scale, scale, scale);
    };

    /** Remove gizmo from scene */
    this.detach = function () {
        // Clean up move mode arrows
        for (var k in self.arrows) {
            var a = self.arrows[k];
            a.shaft.removeBehavior(a.drag);
            a.shaft.dispose(); a.cone.dispose();
            if (a.labelPlane) {
                if (a.labelPlane._gizmoTex) a.labelPlane._gizmoTex.dispose();
                if (a.labelPlane._gizmoMat) a.labelPlane._gizmoMat.dispose();
                a.labelPlane.dispose();
            }
            a.mat.dispose(); a.hoverMat.dispose();
            a.node.dispose();
        }
        self.arrows = {};

        // Clean up rotate mode rings
        for (var k in self.rings) {
            var r = self.rings[k];
            r.torus.removeBehavior(r.drag);
            r.torus.dispose();
            if (r.labelPlane) {
                if (r.labelPlane._gizmoTex) r.labelPlane._gizmoTex.dispose();
                if (r.labelPlane._gizmoMat) r.labelPlane._gizmoMat.dispose();
                r.labelPlane.dispose();
            }
            r.mat.dispose(); r.hoverMat.dispose();
            r.node.dispose();
        }
        self.rings = {};

        // Clean up scale mode handles
        for (var k in self.scaleHandles) {
            var s = self.scaleHandles[k];
            s.cube.removeBehavior(s.drag);
            s.line.dispose(); s.cube.dispose();
            if (s.labelPlane) {
                if (s.labelPlane._gizmoTex) s.labelPlane._gizmoTex.dispose();
                if (s.labelPlane._gizmoMat) s.labelPlane._gizmoMat.dispose();
                s.labelPlane.dispose();
            }
            s.mat.dispose(); s.hoverMat.dispose();
            s.node.dispose();
        }
        self.scaleHandles = {};

        // Clean up free drag behavior
        if (self.freeDragBehavior && self.targetMesh) {
            self.targetMesh.removeBehavior(self.freeDragBehavior);
            self.freeDragBehavior = null;
        }

        if (self.rootNode) { self.rootNode.dispose(); self.rootNode = null; }
        self.targetMesh = null;
        self.isActive = false;
    };

    this.dispose = function () { self.detach(); };
}
