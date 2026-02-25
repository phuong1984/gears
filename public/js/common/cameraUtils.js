/**
 * Camera Utilities — Shared between Configurator and Builder
 * Provides camera preset views and auto-focus functionality
 */
var cameraUtils = new function () {
    var self = this;

    // Duration in ms for camera animation
    this.ANIMATION_DURATION = 500;
    this.FRAMES_PER_SECOND = 60;

    /**
     * Animate camera to a specific alpha/beta/radius
     * @param {object} opts - { alpha, beta, radius, target }
     * @param {function} [callback] - Called when animation completes
     */
    this.animateCameraTo = function (opts, callback) {
        var camera = babylon.cameraArc;
        var scene = babylon.scene;
        var totalFrames = Math.round(self.ANIMATION_DURATION / 1000 * self.FRAMES_PER_SECOND);

        // Stop any running camera animations
        scene.stopAnimation(camera);

        var animations = [];

        if (typeof opts.alpha !== 'undefined') {
            var alphaAnim = new BABYLON.Animation(
                'cameraAlpha', 'alpha', self.FRAMES_PER_SECOND,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            alphaAnim.setKeys([
                { frame: 0, value: camera.alpha },
                { frame: totalFrames, value: opts.alpha }
            ]);
            var easing = new BABYLON.CubicEase();
            easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
            alphaAnim.setEasingFunction(easing);
            animations.push(alphaAnim);
        }

        if (typeof opts.beta !== 'undefined') {
            var betaAnim = new BABYLON.Animation(
                'cameraBeta', 'beta', self.FRAMES_PER_SECOND,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            betaAnim.setKeys([
                { frame: 0, value: camera.beta },
                { frame: totalFrames, value: opts.beta }
            ]);
            var easing2 = new BABYLON.CubicEase();
            easing2.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
            betaAnim.setEasingFunction(easing2);
            animations.push(betaAnim);
        }

        if (typeof opts.radius !== 'undefined') {
            var radiusAnim = new BABYLON.Animation(
                'cameraRadius', 'radius', self.FRAMES_PER_SECOND,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            radiusAnim.setKeys([
                { frame: 0, value: camera.radius },
                { frame: totalFrames, value: opts.radius }
            ]);
            var easing3 = new BABYLON.CubicEase();
            easing3.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
            radiusAnim.setEasingFunction(easing3);
            animations.push(radiusAnim);
        }

        if (typeof opts.target !== 'undefined') {
            var targetAnim = new BABYLON.Animation(
                'cameraTarget', 'target', self.FRAMES_PER_SECOND,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            targetAnim.setKeys([
                { frame: 0, value: camera.target.clone() },
                { frame: totalFrames, value: opts.target }
            ]);
            var easing4 = new BABYLON.CubicEase();
            easing4.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
            targetAnim.setEasingFunction(easing4);
            animations.push(targetAnim);
        }

        if (animations.length === 0) {
            if (callback) callback();
            return;
        }

        camera.animations = animations;
        scene.beginAnimation(camera, 0, totalFrames, false, 1, function () {
            camera.animations = [];
            if (callback) callback();
        });
    };

    /**
     * Camera preset views
     * Note: In this project, the coordinate system uses:
     *   Descartes X = BabylonJS X
     *   Descartes Y = BabylonJS Z
     *   Descartes Z = BabylonJS Y
     */
    this.presets = {
        front: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
        back: { alpha: Math.PI / 2, beta: Math.PI / 2 },
        top: { alpha: -Math.PI / 2, beta: 0.01 },     // Avoid exactly 0 (gimbal issues)
        bottom: { alpha: -Math.PI / 2, beta: Math.PI - 0.01 },
        left: { alpha: -Math.PI, beta: Math.PI / 2 },
        right: { alpha: 0, beta: Math.PI / 2 },
        default3d: { alpha: -Math.PI / 2, beta: Math.PI / 5 },
    };

    /**
     * Set camera to a named preset with animation
     * @param {string} presetName - one of: front, back, top, bottom, left, right, default3d
     */
    this.setCameraPreset = function (presetName) {
        var preset = self.presets[presetName];
        if (!preset) {
            console.warn('[cameraUtils] Unknown preset:', presetName);
            return;
        }

        // If camera is in orthoTop mode, switch to Arc first
        if (babylon.cameraMode === 'orthoTop') {
            babylon.setCameraMode('arc');
        }

        // Unlock target if locked
        if (babylon.cameraArc.lockedTarget) {
            var target = babylon.cameraArc.getTarget().clone();
            babylon.cameraArc.lockedTarget = null;
            babylon.cameraArc.setTarget(target);
        }

        self.animateCameraTo(preset);
    };

    /**
     * Auto-focus camera on a given mesh (smooth zoom + reposition)
     * @param {BABYLON.Mesh} mesh - The mesh to focus on
     */
    this.focusOnMesh = function (mesh) {
        if (!mesh) return;

        mesh.computeWorldMatrix(true);
        var boundingInfo = mesh.getBoundingInfo();
        var center = boundingInfo.boundingBox.centerWorld;
        var extendSize = boundingInfo.boundingBox.extendSizeWorld;

        // Calculate ideal radius based on bounding box size
        var maxExtent = Math.max(extendSize.x, extendSize.y, extendSize.z);
        var idealRadius = Math.max(maxExtent * 4, 15); // At least 15 units away

        // If camera is in orthoTop mode, switch to Arc first
        if (babylon.cameraMode === 'orthoTop') {
            babylon.setCameraMode('arc');
        }

        // Unlock target
        if (babylon.cameraArc.lockedTarget) {
            babylon.cameraArc.lockedTarget = null;
        }

        self.animateCameraTo({
            target: center,
            radius: idealRadius
        });
    };

    /**
     * Setup double-click auto-focus for a scene
     * Call this once after scene is setup.
     * @param {function} [onFocus] - Optional callback when a mesh is focused
     */
    this.setupDoubleClickFocus = function (onFocus) {
        if (!babylon.scene) return;

        var lastClickTime = 0;
        var lastClickMesh = null;
        var DOUBLE_CLICK_THRESHOLD = 350; // ms

        babylon.scene.onPointerObservable.add(function (pointerInfo) {
            if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERUP) return;
            if (pointerInfo.event.button !== 0) return; // Left click only

            var now = Date.now();
            var pickedMesh = pointerInfo.pickInfo.pickedMesh;

            if (pickedMesh && pickedMesh === lastClickMesh && (now - lastClickTime) < DOUBLE_CLICK_THRESHOLD) {
                // Double click detected!
                self.focusOnMesh(pickedMesh);
                if (onFocus) onFocus(pickedMesh);
                lastClickTime = 0;
                lastClickMesh = null;
            } else {
                lastClickTime = now;
                lastClickMesh = pickedMesh;
            }
        });
    };
};
