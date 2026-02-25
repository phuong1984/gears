/**
 * CustomGizmo — Position & Rotation manipulation gizmo
 * Supports two modes:
 *   - 'move':   colored axis arrows (Red=X, Green=Z(BJS Y), Blue=Y(BJS Z))
 *   - 'rotate': colored torus rings for rotation around each axis
 * Each handle constrains interaction to a single axis (= axis locking)
 * Descartes coordinate mapping: BJS X=X, BJS Y=Z, BJS Z=Y
 */
function CustomGizmo(scene) {
    var self = this;
    this.scene = scene;
    this.arrows = {};   // move mode elements
    this.rings = {};    // rotate mode elements
    this.rootNode = null;
    this.targetMesh = null;
    this.isActive = false;
    this.mode = 'move'; // 'move' or 'rotate'

    // Callbacks
    this.onDragStartCb = null;
    this.onDragEndCb = null;

    // Config — Move
    var SHAFT_LENGTH = 0.8;
    var SHAFT_RADIUS = 0.024;
    var CONE_HEIGHT = 0.2;
    var CONE_RADIUS = 0.07;
    var SCALE_FACTOR = 0.24;

    // Config — Rotate
    var TORUS_DIAMETER = 1.6;
    var TORUS_THICKNESS = 0.03;
    var TORUS_TESSELLATION = 32;

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
     *   mode: 'move' (default) or 'rotate'
     */
    this.attach = function (mesh, opts) {
        self.detach();
        if (!mesh) return;

        opts = opts || {};
        self.targetMesh = mesh;
        self.mode = opts.mode || 'move';
        self.onDragStartCb = opts.onDragStart || null;
        self.onDragEndCb = opts.onDragEnd || null;

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
        } else {
            self._createArrow('x', COLORS.x, new BABYLON.Vector3(1, 0, 0));
            self._createArrow('y', COLORS.y, new BABYLON.Vector3(0, 1, 0));
            self._createArrow('z', COLORS.z, new BABYLON.Vector3(0, 0, 1));
        }

        self.isActive = true;
        self.update();
    };

    // ===================== MOVE MODE: Arrows =====================

    this._createArrow = function (axisName, color, axisDir) {
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
        var labelPlane = self._createLabel(axisName, color, axisDir);

        // Orient arrow along axis
        if (axisName === 'x') {
            arrowNode.rotation.z = -Math.PI / 2;
        } else if (axisName === 'z') {
            arrowNode.rotation.x = Math.PI / 2;
        }

        // Drag behavior constrained to axis
        var dragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: axisDir });
        dragBehavior.useObjectOrientationForDragging = false;
        dragBehavior.moveAttached = false;

        dragBehavior.onDragStartObservable.add(function () {
            shaft.material = hoverMat;
            cone.material = hoverMat;
            if (self.onDragStartCb) self.onDragStartCb(axisName);
        });

        dragBehavior.onDragObservable.add(function (event) {
            var delta = event.delta;
            if (self.targetMesh.parent) {
                var matrix = self.targetMesh.parent.getWorldMatrix().clone().invert();
                matrix.setTranslation(BABYLON.Vector3.Zero());
                delta = BABYLON.Vector3.TransformCoordinates(delta, matrix);
            }
            self.targetMesh.position.addInPlace(delta);
            self.update();
        });

        dragBehavior.onDragEndObservable.add(function () {
            shaft.material = mat;
            cone.material = mat;
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
        var labelPlane = self._createLabel(axisName, color, axisDir);

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
        labelMat.emissiveColor = color;
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
        var scale = Math.min(Math.max(dist * SCALE_FACTOR, 0.5), 15);
        self.rootNode.scaling.setAll(scale);
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

        if (self.rootNode) { self.rootNode.dispose(); self.rootNode = null; }
        self.targetMesh = null;
        self.isActive = false;
    };

    this.dispose = function () { self.detach(); };
}
