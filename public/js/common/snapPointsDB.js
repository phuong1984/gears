// =============================================================================
// snapPointsDB.js — Snap Points Registry
// =============================================================================
//
// Central registry of snap point definitions for all component types and models.
//
// COORDINATE SYSTEM: Descartes (project convention)
//   X = right/left
//   Y = forward/backward
//   Z = up/down
//
// SNAP POINT FORMAT:
//   {
//     name:     string  — Human-readable name (e.g. 'top', 'shaft', 'mountBack')
//     localPos: [x,y,z] — Position in component's local space (Descartes coords)
//     normal:   [x,y,z] — Outward-facing direction (Descartes coords, unit vector)
//     role:     string  — One of: 'surface', 'axle', 'mount', 'attach'
//   }
//
// ROLES:
//   'surface' — Flat face of a block/body. Can snap to other surfaces or attach points.
//   'attach'  — A point that attaches TO a surface (sensor backs, bottoms).
//   'mount'   — A mounting point where children attach (arm tips, platform tops).
//   'axle'    — Rotational axis (motor shafts, wheel centers).
//
// COMPATIBILITY MATRIX:
//   surface ↔ surface  ✅  (two boxes side by side)
//   surface ↔ attach   ✅  (sensor onto body face)
//   mount   ↔ attach   ✅  (sensor onto arm tip)
//   axle    ↔ axle     ✅  (wheel onto motor shaft)
//   attach  ↔ attach   ❌  (two backs together = no)
//   mount   ↔ mount    ❌  (two tips together = no)
//
// =============================================================================

var SNAP_POINTS_DB = {

    // ===========================================================================
    // ROBOT BODY — Dynamic snap points scaled by body dimensions
    // ===========================================================================
    '__body__': {
        dynamic: true,
        getSnapPoints: function (options) {
            // Default box body dimensions
            var w = (options.bodyWidth || 14) / 2;
            var d = (options.bodyLength || 16) / 2;
            var h = (options.bodyHeight || 4) / 2;
            return [
                { name: 'top', localPos: [0, 0, h], normal: [0, 0, 1], role: 'surface' },
                { name: 'bottom', localPos: [0, 0, -h], normal: [0, 0, -1], role: 'surface' },
                { name: 'front', localPos: [0, d, 0], normal: [0, 1, 0], role: 'surface' },
                { name: 'back', localPos: [0, -d, 0], normal: [0, -1, 0], role: 'surface' },
                { name: 'right', localPos: [w, 0, 0], normal: [1, 0, 0], role: 'surface' },
                { name: 'left', localPos: [-w, 0, 0], normal: [-1, 0, 0], role: 'surface' }
            ];
        }
    },

    // ===========================================================================
    // PRIMITIVE BLOCKS — Snap points are dynamic (scaled by actual dimensions)
    // localPos uses multiplier format: actual pos = multiplier × dimension/2
    // ===========================================================================

    // BoxBlock: BJS CreateBox({height, width, depth})
    // BJS coords: height=Y, width=X, depth=Z
    // Descartes:  width=X, depth=Y, height=Z
    '__primitive__/Box': {
        dynamic: true, // snap points scale with component dimensions
        getSnapPoints: function (options) {
            var w = (options.width || 1) / 2;
            var d = (options.depth || 1) / 2;
            var h = (options.height || 1) / 2;
            return [
                { name: 'top', localPos: [0, 0, h], normal: [0, 0, 1], role: 'surface' },
                { name: 'bottom', localPos: [0, 0, -h], normal: [0, 0, -1], role: 'surface' },
                { name: 'front', localPos: [0, d, 0], normal: [0, 1, 0], role: 'surface' },
                { name: 'back', localPos: [0, -d, 0], normal: [0, -1, 0], role: 'surface' },
                { name: 'right', localPos: [w, 0, 0], normal: [1, 0, 0], role: 'surface' },
                { name: 'left', localPos: [-w, 0, 0], normal: [-1, 0, 0], role: 'surface' }
            ];
        }
    },

    // CylinderBlock: BJS CreateCylinder({height, diameter})
    // BJS: height=Y-axis, diameter=XZ plane
    // Descartes: height=Z-axis
    '__primitive__/Cylinder': {
        dynamic: true,
        getSnapPoints: function (options) {
            var h = (options.height || 1) / 2;
            return [
                { name: 'top', localPos: [0, 0, h], normal: [0, 0, 1], role: 'surface' },
                { name: 'bottom', localPos: [0, 0, -h], normal: [0, 0, -1], role: 'surface' }
            ];
        }
    },

    // SphereBlock: BJS CreateSphere({diameter})
    // Only top snap point makes physical sense
    '__primitive__/Sphere': {
        dynamic: true,
        getSnapPoints: function (options) {
            var r = (options.diameter || 1) / 2;
            return [
                { name: 'top', localPos: [0, 0, r], normal: [0, 0, 1], role: 'surface' }
            ];
        }
    },

    // ===========================================================================
    // SENSORS — Fixed geometry, snap points at known positions
    // Sensors "attach" to other surfaces via their back/bottom faces
    // ===========================================================================

    // ColorSensor: Box 2×3×2 (BJS w×d×h = Desc X×Y×Z: 2×3×2)
    // Sensing direction: +Z (BJS), which is +Y (Descartes) = forward
    // Eye at Z=1.5 (BJS) = Y=1.5 (Desc) = front
    // Back face at Z=-1.5 (BJS) = Y=-1.5 (Desc)
    'ColorSensor': {
        snapPoints: [
            { name: 'mountBack', localPos: [0, -1.5, 0], normal: [0, -1, 0], role: 'attach' },
            { name: 'top', localPos: [0, 0, 1], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // UltrasonicSensor: Box 5×2.5×2 (BJS w×d×h = Desc X×Y×Z: 5×2.5×2)
    // Eyes at Z=1 (BJS) = Y=1 (Desc) = front
    // Rear body at Z=-0.25 (BJS) = Y=-0.25 (Desc)
    'UltrasonicSensor': {
        snapPoints: [
            { name: 'mountBack', localPos: [0, -1.25, 0], normal: [0, -1, 0], role: 'attach' },
            { name: 'top', localPos: [0, 0, 1], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // LaserRangeSensor: Box 1.5×1.5×2.5 (BJS w×d×h = Desc X×Y×Z: 1.5×1.5×2.5)
    // Shoots ray downward (-Y BJS = -Z Desc)
    'LaserRangeSensor': {
        snapPoints: [
            { name: 'mountTop', localPos: [0, 0, 1.25], normal: [0, 0, 1], role: 'attach' }
        ]
    },

    // CameraSensor: Box 1.5×2.5×1.5 (BJS w×d×h = Desc X×Y×Z: 1.5×2.5×1.5)
    // Camera points +Z (BJS) = +Y (Desc) = forward
    'CameraSensor': {
        snapPoints: [
            { name: 'mountBack', localPos: [0, -1.25, 0], normal: [0, -1, 0], role: 'attach' },
            { name: 'top', localPos: [0, 0, 0.75], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // GPSSensor: Box 2×2×1 (BJS w×d×h = Desc X×Y×Z: 2×2×1)
    'GPSSensor': {
        snapPoints: [
            { name: 'mountBottom', localPos: [0, 0, -0.5], normal: [0, 0, -1], role: 'attach' },
            { name: 'top', localPos: [0, 0, 0.5], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // GyroSensor: No visible body (internal sensor), but share same structure
    // Gyro is typically inside the robot body, no snap points needed
    'GyroSensor': {
        snapPoints: []
    },

    // TouchSensor: Box width×depth×2 (BJS w×d×h = Desc X×Y×Z: width×depth×2)
    // Red sensor pad at BJS Y=-1.4 = Desc Z=-1.4 (bottom)
    'TouchSensor': {
        dynamic: true,
        getSnapPoints: function (options) {
            var w = (options.width || 2) / 2;
            var d = (options.depth || 2) / 2;
            return [
                { name: 'mountTop', localPos: [0, 0, 1], normal: [0, 0, 1], role: 'attach' },
                { name: 'front', localPos: [0, d, 0], normal: [0, 1, 0], role: 'surface' },
                { name: 'back', localPos: [0, -d, 0], normal: [0, -1, 0], role: 'surface' }
            ];
        }
    },

    // LidarSensor: Cylinder height=1, diameter=4
    // BJS: Y-axis height → Descartes: Z-axis height
    'LidarSensor': {
        snapPoints: [
            { name: 'mountBottom', localPos: [0, 0, -0.5], normal: [0, 0, -1], role: 'attach' },
            { name: 'top', localPos: [0, 0, 0.5], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // ===========================================================================
    // ACTUATORS — Have specific mechanical snap points (shafts, tips, platforms)
    // ===========================================================================

    // ArmActuator:
    //   Base body: Box 2×3×3 (BJS w×d×h = Desc X×Y×Z: 2×3×3)
    //   Arm: extends along BJS Z = Desc Y (forward), length = armLength
    //   Pivot at BJS Y=0.5 above body = Desc Z=0.5
    //   Arm tip at end of arm
    'ArmActuator': {
        dynamic: true,
        getSnapPoints: function (options) {
            var armLen = options.armLength || 18;
            // Arm tip is at end of arm, relative to pivot
            // arm.position.z = (armLength/2) - 1 in BJS = Desc Y
            return [
                { name: 'armTip', localPos: [0, armLen - 2, 2], normal: [0, 1, 0], role: 'mount' },
                { name: 'base', localPos: [0, 0, -1.5], normal: [0, 0, -1], role: 'attach' }
            ];
        }
    },

    // SwivelActuator:
    //   Base: Box h=1, w=width, d=width (BJS) = Desc X=width, Y=width, Z=1
    //   Platform: Cylinder h=0.5, at BJS Y=0.75 above body = Desc Z=0.75
    'SwivelActuator': {
        dynamic: true,
        getSnapPoints: function (options) {
            var w = (options.width || 3) / 2;
            return [
                { name: 'platform', localPos: [0, 0, 1], normal: [0, 0, 1], role: 'mount' },
                { name: 'base', localPos: [0, 0, -0.5], normal: [0, 0, -1], role: 'attach' }
            ];
        }
    },

    // MotorActuator:
    //   Housing: Box housingSize[0]×housingSize[1]×housingSize[2]
    //   Shaft: along shaftAxis, at shaftOffset
    //   BJS housingSize = [w, h, d] → Desc [X, Z, Y]
    'MotorActuator': {
        dynamic: true,
        getSnapPoints: function (options, component) {
            var hs = options.housingSize || [3, 3, 3];
            var so = options.shaftOffset || [0, 0, 2.5];
            var sa = options.shaftAxis || [0, 0, 1];
            var sl = options.shaftLength || 2;

            // Housing faces (BJS [w,h,d] → Desc [X,Z,Y])
            var hw = hs[0] / 2; // Desc X half
            var hh = hs[1] / 2; // Desc Z half
            var hd = hs[2] / 2; // Desc Y half

            var cx = 0, cy = 0, cz = 0;

            // If the MotorActuator has a loaded 3D model, its boundaries will replace the default housing box
            if (component && component.modelBoundingSize) {
                hw = component.modelBoundingSize.x / 2;
                hh = component.modelBoundingSize.y / 2; // BJS Y = Desc Z
                hd = component.modelBoundingSize.z / 2; // BJS Z = Desc Y

                if (component.modelBoundingOffset) {
                    cx = component.modelBoundingOffset.x;
                    cy = component.modelBoundingOffset.z; // BJS Z = Desc Y
                    cz = component.modelBoundingOffset.y; // BJS Y = Desc Z
                }
            }

            // shaftOffset and shaftAxis are in GLOBAL Descartes [X,Y,Z] directly
            // No BJS→Descartes remapping needed
            var shaftTipDesc = [
                so[0] + sa[0] * sl,  // Desc X
                so[1] + sa[1] * sl,  // Desc Y
                so[2] + sa[2] * sl   // Desc Z
            ];
            var shaftNormalDesc = [sa[0], sa[1], sa[2]];

            return [
                { name: 'shaft', localPos: shaftTipDesc, normal: shaftNormalDesc, role: 'axle' },
                { name: 'bottom', localPos: [cx, cy, cz - hh], normal: [0, 0, -1], role: 'attach' },
                { name: 'top', localPos: [cx, cy, cz + hh], normal: [0, 0, 1], role: 'surface' },
                { name: 'front', localPos: [cx, cy + hd, cz], normal: [0, 1, 0], role: 'surface' },
                { name: 'back', localPos: [cx, cy - hd, cz], normal: [0, -1, 0], role: 'surface' }
            ];
        }
    },

    // LinearActuator:
    //   Base: Box w=width, h=baseThickness, d=baseLength (BJS)
    //   → Desc: X=width, Y=baseLength, Z=baseThickness
    //   Platform slides along BJS Z = Desc Y
    'LinearActuator': {
        dynamic: true,
        getSnapPoints: function (options) {
            var bl = (options.baseLength || 5) / 2;
            var bt = (options.baseThickness || 1) / 2;
            return [
                { name: 'tip', localPos: [0, bl, bt + 0.5], normal: [0, 1, 0], role: 'mount' },
                { name: 'base', localPos: [0, 0, -bt], normal: [0, 0, -1], role: 'attach' }
            ];
        }
    },

    // MagnetActuator:
    //   Body: Box 2×2×2.5 (BJS w×d×h = Desc X×Y×Z: 2×2×2.5)
    //   Attractor cylinder at BJS Y=-0.75 = Desc Z=-0.75 (bottom)
    'MagnetActuator': {
        snapPoints: [
            { name: 'tip', localPos: [0, 0, -1.25], normal: [0, 0, -1], role: 'mount' },
            { name: 'mountBack', localPos: [0, -1, 0], normal: [0, -1, 0], role: 'attach' },
            { name: 'top', localPos: [0, 0, 1.25], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // PaintballLauncherActuator:
    //   Body: Box 2×9×2.5 (BJS w×d×h = Desc X×Y×Z: 2×9×2.5)
    //   Barrel tip at front
    'PaintballLauncherActuator': {
        snapPoints: [
            { name: 'base', localPos: [0, -4.5, -1], normal: [0, -1, 0], role: 'attach' },
            { name: 'top', localPos: [0, 0, 1.25], normal: [0, 0, 1], role: 'surface' }
        ]
    },

    // Pen:
    //   Body: Box 1.5×1.5×3 (BJS w×d×h = Desc X×Y×Z: 1.5×1.5×3)
    //   Tip at BJS Y=-2 = Desc Z=-2 (bottom)
    'Pen': {
        snapPoints: [
            { name: 'mountTop', localPos: [0, 0, 1.5], normal: [0, 0, 1], role: 'attach' }
        ]
    },

    // ===========================================================================
    // WHEELS — Snap onto axles (motor shafts)
    // ===========================================================================

    // WheelPassive: Cylinder, oriented horizontally
    //   BJS height=width (along BJS X), diameter
    //   Center is the axle point
    'WheelPassive': {
        snapPoints: [
            { name: 'center', localPos: [0, 0, 0], normal: [1, 0, 0], role: 'axle' }
        ]
    },

    // WheelActuator (main robot wheels, handled by Robot.js, not a component)
    // Included for completeness — same as WheelPassive
    'WheelActuator': {
        snapPoints: [
            { name: 'center', localPos: [0, 0, 0], normal: [1, 0, 0], role: 'axle' }
        ]
    },

    // ===========================================================================
    // MODEL BLOCKS — Fallback to auto bounding box snap (see snapManager.js)
    // Custom snap points can be stored per-model URL in this DB
    // ===========================================================================

    'ModelBlock': {
        // No fixed snap points — uses auto bounding box from snapManager
        snapPoints: null
    }

    // ===========================================================================
    // DEVELOPER: Add snap points for specific built-in 3D models below.
    // Use the model URL as key (matching BUILT_IN_MODELS entries).
    //
    // Example:
    //   'models/Kenny.nl - Cars/ambulance.glb': {
    //     snapPoints: [
    //       { name: 'roof', localPos: [0, 2.1, 0], normal: [0, 0, 1], role: 'surface' },
    //       { name: 'hitch', localPos: [0, -2, 0.3], normal: [0, -1, 0], role: 'mount' }
    //     ]
    //   }
    // ===========================================================================

};

// =============================================================================
// Compatibility check function
// =============================================================================
SNAP_POINTS_DB.isCompatible = function (roleA, roleB) {
    // Symmetric compatibility matrix
    var compat = {
        'surface|surface': true,
        'surface|attach': true,
        'attach|surface': true,
        'mount|attach': true,
        'attach|mount': true,
        'axle|axle': true,
        // Everything else is incompatible
        'attach|attach': false,
        'mount|mount': false,
        'surface|mount': true,
        'mount|surface': true,
        'surface|axle': false,
        'axle|surface': false,
        'attach|axle': false,
        'axle|attach': false,
        'mount|axle': false,
        'axle|mount': false
    };

    var key = roleA + '|' + roleB;
    return compat[key] === true;
};
