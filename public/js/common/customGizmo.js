/**
 * CustomGizmo — Position manipulation gizmo with colored axis arrows
 * Red=X, Green=Z(BJS Y), Blue=Y(BJS Z) for Descartes coordinate mapping
 * Each arrow constrains dragging to a single axis (= axis locking)
 */
function CustomGizmo(scene) {
    var self = this;
    this.scene = scene;
    this.arrows = {};
    this.rootNode = null;
    this.targetMesh = null;
    this.isActive = false;

    // Callbacks
    this.onDragStartCb = null;
    this.onDragEndCb = null;

    // Config
    var SHAFT_LENGTH = 0.8;
    var SHAFT_RADIUS = 0.024;
    var CONE_HEIGHT = 0.2;
    var CONE_RADIUS = 0.07;
    var SCALE_FACTOR = 0.24;

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
     * Attach position gizmo to a mesh
     * @param {BABYLON.Mesh} mesh
     * @param {object} opts - { onDragStart, onDragEnd }
     */
    this.attach = function (mesh, opts) {
        self.detach();
        if (!mesh) return;

        opts = opts || {};
        self.targetMesh = mesh;
        self.onDragStartCb = opts.onDragStart || null;
        self.onDragEndCb = opts.onDragEnd || null;

        self.rootNode = new BABYLON.TransformNode('gizmoRoot', scene);
        mesh.computeWorldMatrix(true);
        self.rootNode.position.copyFrom(mesh.absolutePosition);

        // Ensure gizmo renders on top
        scene.setRenderingAutoClearDepthStencil(2, true, true, false);

        // BabylonJS axes: X=right, Y=up, Z=forward
        self._createArrow('x', COLORS.x, new BABYLON.Vector3(1, 0, 0));
        self._createArrow('y', COLORS.y, new BABYLON.Vector3(0, 1, 0));
        self._createArrow('z', COLORS.z, new BABYLON.Vector3(0, 0, 1));

        self.isActive = true;
        self.update();
    };

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

        // Axis label (X/Y/Z) at the tip of the arrow using DynamicTexture
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
        labelPlane.parent = self.rootNode;  // Parent to rootNode, not arrowNode (avoids rotation conflicts with billboard)
        labelPlane.renderingGroupId = 2;
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        // Position at the tip of the arrow along its axis direction
        var tipOffset = SHAFT_LENGTH + CONE_HEIGHT + 0.15;
        labelPlane.position = axisDir.scale(tipOffset);
        labelPlane.isPickable = false;

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

        self.arrows[axisName] = { node: arrowNode, shaft: shaft, cone: cone, labelPlane: labelPlane, labelMat: labelMat, labelTex: labelTex, mat: mat, hoverMat: hoverMat, drag: dragBehavior };
    };

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
        for (var k in self.arrows) {
            var a = self.arrows[k];
            a.shaft.removeBehavior(a.drag);
            a.shaft.dispose(); a.cone.dispose();
            if (a.labelPlane) { a.labelPlane.dispose(); }
            if (a.labelTex) { a.labelTex.dispose(); }
            if (a.labelMat) { a.labelMat.dispose(); }
            a.mat.dispose(); a.hoverMat.dispose();
            a.node.dispose();
        }
        self.arrows = {};
        if (self.rootNode) { self.rootNode.dispose(); self.rootNode = null; }
        self.targetMesh = null;
        self.isActive = false;
    };

    this.dispose = function () { self.detach(); };
}
