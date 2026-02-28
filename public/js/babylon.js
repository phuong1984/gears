var babylon = new function () {
  var self = this;

  this.DISABLE_ASYNC = true;
  this.ENABLE_ANTIALIASING = false;
  // this.ENABLE_ANTIALIASING = true;

  this.world = worlds[0];

  // Whether the sim panel is currently active (user is on Simulator tab)
  this.simActive = false;

  // Track whether babylon has been initialized yet (lazy init)
  this.initialized = false;

  // Ammo instance - stored after DOMContentLoaded, used when init() is called
  this._ammoInstance = null;

  // Internal flag to pause rendering during scene rebuilds
  this._renderingPaused = false;

  // Run on page load
  this.init = function () {
    self.canvas = document.getElementById('renderCanvas');
    self.engine = new BABYLON.Engine(self.canvas, self.ENABLE_ANTIALIASING);

    self.scene = self.createScene();

    self.engine.runRenderLoop(function () {
      if (self._renderingPaused) return;
      var shouldRender = self.simActive
        || (typeof skulpt != 'undefined' && skulpt.running);
      if (shouldRender && self.scene) {
        self.scene.render();
      }
    });

    window.addEventListener('resize', function () {
      self.engine.resize();
    });

    self.initialized = true;
    self.engine.resize();

    // Load world and meshes asynchronously
    self.world.setOptions().then(function () {
      self.loadMeshes(self.scene);
    });
  };

  // Create the scene (called once from init)
  this.createScene = function () {
    var scene = new BABYLON.Scene(self.engine);
    var gravityVector = new BABYLON.Vector3(0, -98.1, 0);
    var physicsPlugin = new BABYLON.AmmoJSPlugin(true, self._ammoInstance || window.Ammo);
    scene.enablePhysics(gravityVector, physicsPlugin);

    var cameraArc = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 2, Math.PI / 5, 200, new BABYLON.Vector3(0, 0, 0), scene);
    cameraArc.attachControl(self.canvas, true);
    cameraArc.zoomToMouseLocation = true;
    self.cameraArc = cameraArc;
    self.resetCamera();
    self.setCameraMode('arc');

    // Controls for Orthographic camera
    scene.onPointerObservable.add(self.zoomOrtho, BABYLON.PointerEventTypes.POINTERWHEEL);

    // Add GUI layer
    if (typeof BABYLON.GUI != 'undefined') {
      self.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    }

    // Add lights to the scene
    var lightHemi = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);
    lightHemi.groundColor = new BABYLON.Color3(0.1, 0.2, 0.1);
    lightHemi.intensity = 0.5;

    var lightDir = new BABYLON.DirectionalLight('DirectionalLight', new BABYLON.Vector3(-1, -1, -1), scene);
    lightDir.position.y = 100;
    lightDir.position.x = 400;
    lightDir.position.z = 400;
    lightDir.intensity = 0.8;
    lightDir.autoCalcShadowZBounds = true;

    // Shadows - DISABLED for BabylonJS 8.x (causes WebGL prog-deleted errors)
    // scene.shadowGenerator = new BABYLON.ShadowGenerator(512, lightDir);
    // scene.shadowGenerator.forceBackFacesOnly = true;

    // SceneOptimizer - DISABLED for BabylonJS 8.x compatibility
    // var options = new BABYLON.SceneOptimizerOptions(80, 2000);
    // options.addOptimization(new BABYLON.HardwareScalingOptimization(0, 2));
    // self.optimizer = new BABYLON.SceneOptimizer(scene, options);

    return scene;
  };

  // Set othographic camera zoom
  this.zoomOrtho = function (p) {
    if (self.cameraMode != 'orthoTop') {
      return;
    }

    let wheelDelta = 0;
    if (typeof p != 'undefined') {
      var event = p.event;
      if (event.wheelDelta) {
        wheelDelta = event.wheelDelta;
      } else {
        wheelDelta = -(event.deltaY || event.detail) * 60;
      }
    }

    self.cameraArc.orthoRadius -= wheelDelta / 12;

    let zoomScale = self.cameraArc.orthoRadius / 2.5;
    let aspectRatio = self.canvas.width / self.canvas.height;
    self.cameraArc.orthoTop = 1 * zoomScale;
    self.cameraArc.orthoBottom = -1 * zoomScale;
    self.cameraArc.orthoLeft = -aspectRatio * zoomScale;
    self.cameraArc.orthoRight = aspectRatio * zoomScale;
  };

  // Set camera to default
  this.resetCamera = function () {
    self.cameraArc.alpha = -Math.PI / 2;
    self.cameraArc.beta = Math.PI / 5;
    self.cameraArc.radius = 200;
    self.cameraArc.origAlpha = -Math.PI / 2;
    self.cameraArc.origBeta = Math.PI / 5;
    self.cameraArc.panningAxis = new BABYLON.Vector3(1, 1, 0);
    self.cameraArc.wheelPrecision = 3;
    self.cameraArc.lowerRadiusLimit = 10;
    self.cameraArc.panningSensibility = 100;
    self.cameraArc.angularSensibility = 2000;
    self.cameraArc.angularSensibilityX = self.cameraArc.angularSensibility;
    self.cameraArc.angularSensibilityY = self.cameraArc.angularSensibility;
  };

  // Set camera mode
  this.setCameraMode = function (mode) {
    if (typeof mode != 'undefined') {
      self.cameraMode = mode;
    }

    if (self.cameraMode == 'follow') {
      if (self.cameraArc.origAlpha !== null) {
        self.cameraArc.alpha = self.cameraArc.origAlpha;
      }
      if (self.cameraArc.origBeta !== null) {
        self.cameraArc.beta = self.cameraArc.origBeta;
      }
      self.cameraArc.origAlpha = null;
      self.cameraArc.origBeta = null;
      // Guard: robot.body may not exist yet during initial scene creation
      if (typeof robot !== 'undefined' && robot.body) {
        self.cameraArc.lockedTarget = robot.body;
      }
      self.cameraArc._panningMouseButton = 1;
      babylon.cameraArc.mode = BABYLON.Camera.PERSPECTIVE_CAMERA
      self.cameraArc.inputs.attached.keyboard.attachControl();
      self.cameraArc.angularSensibilityX = self.cameraArc.angularSensibility;
      self.cameraArc.angularSensibilityY = self.cameraArc.angularSensibility;
    } else if (self.cameraMode == 'orthoTop') {
      self.cameraArc.origAlpha = self.cameraArc.alpha;
      self.cameraArc.origBeta = self.cameraArc.beta;
      let target = self.cameraArc.getTarget().clone();
      self.cameraArc.lockedTarget = null;
      self.cameraArc.setTarget(target);
      self.cameraArc.alpha = -Math.PI / 2;
      self.cameraArc.beta = 0;
      self.cameraArc._panningMouseButton = 0; // change functionality from left to right mouse button
      self.cameraArc.orthoRadius = self.cameraArc.radius;
      self.cameraArc.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
      self.zoomOrtho();
      self.cameraArc.inputs.attached.keyboard.detachControl();
      self.cameraArc.angularSensibilityX = 10000000;
      self.cameraArc.angularSensibilityY = 10000000;
    } else if (self.cameraMode == 'arc') {
      if (self.cameraArc.origAlpha !== null) {
        self.cameraArc.alpha = self.cameraArc.origAlpha;
      }
      if (self.cameraArc.origBeta !== null) {
        self.cameraArc.beta = self.cameraArc.origBeta;
      }
      self.cameraArc.origAlpha = null;
      self.cameraArc.origBeta = null;
      let target = self.cameraArc.getTarget().clone();
      self.cameraArc.lockedTarget = null;
      self.cameraArc.setTarget(target);
      self.cameraArc._panningMouseButton = 1;
      babylon.cameraArc.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
      self.cameraArc.inputs.attached.keyboard.attachControl();
      self.cameraArc.angularSensibilityX = self.cameraArc.angularSensibility;
      self.cameraArc.angularSensibilityY = self.cameraArc.angularSensibility;
    }
  }

  // Reset scene
  // BabylonJS 8.x FIX: Do NOT dispose the entire scene, as this corrupts
  // WebGL shader programs shared with the engine. Instead, selectively remove
  // all meshes, materials, and physics bodies, then reload into the same scene.
  this.resetScene = function () {
    // Save camera state
    let target = self.cameraArc.target.clone();
    let alpha = self.cameraArc.alpha;
    let beta = self.cameraArc.beta;
    let radius = self.cameraArc.radius;
    let mode = self.cameraMode;

    // Pause rendering while the scene is being rebuilt
    self._renderingPaused = true;
    var wasActive = self.simActive;
    self.simActive = false;

    // Remove action manager
    if (self.scene.actionManager) {
      self.scene.actionManager.actions = [];
      self.scene.actionManager.dispose();
      self.scene.actionManager = null;
    }

    // Remove all meshes, but preserve materials and textures so that GLTF Loader cache remains valid!
    // dispose(false, false) ensures we don't cascade the disposal to the mesh's materials.
    while (self.scene.meshes.length > 0) {
      self.scene.meshes[self.scene.meshes.length - 1].dispose(false, false);
    }

    // Remove extra cameras (keep main camera)
    for (let i = self.scene.cameras.length - 1; i > 0; i--) {
      self.scene.cameras[i].dispose();
    }

    // Disable and re-enable physics to reset bodies
    if (self.scene.isPhysicsEnabled()) {
      self.scene.disablePhysicsEngine();
      var gravityVector = new BABYLON.Vector3(0, -98.1, 0);
      var physicsPlugin = new BABYLON.AmmoJSPlugin(true, self._ammoInstance || window.Ammo);
      self.scene.enablePhysics(gravityVector, physicsPlugin);
    }

    // Remove GUI
    if (self.gui) {
      self.gui.dispose();
      self.gui = null;
    }
    if (typeof BABYLON.GUI != 'undefined') {
      self.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    }

    // Reset camera
    self.resetCamera();

    return self.loadMeshes(self.scene).then(function () {
      // Restore camera
      self.setCameraMode(mode);
      self.cameraArc.alpha = alpha;
      self.cameraArc.beta = beta;
      self.cameraArc.radius = radius;
      self.cameraArc.setTarget(target);
      self.cameraArc.origAlpha = null;
      self.cameraArc.origBeta = null;
      // Resume rendering now that the scene is fully built
      self.simActive = wasActive;
      self._renderingPaused = false;
    }).catch(function (err) {
      console.error('[GEARS] resetScene loadMeshes error:', err);
      // Always resume rendering even if loading failed
      self.simActive = wasActive;
      self._renderingPaused = false;
    });
  };

  // Load meshes
  this.loadMeshes = function () {
    // self.engine.displayLoadingUI(); // Turns transparent, but doesn't disappear in some circumstances

    // Load ruler markers
    let markerOptions = {
      height: 4,
      diameterTop: 2,
      diameterBottom: 0.01,
      tessellation: 3
    };

    let greenMat = self.getMaterial(self.scene, '00ff00');
    self.marker1 = BABYLON.MeshBuilder.CreateCylinder('marker1', markerOptions, self.scene);
    self.marker1.material = greenMat;
    self.marker1.isPickable = false;
    self.marker1.isVisible = false;

    let redMat = self.getMaterial(self.scene, 'ff0000');
    self.marker2 = BABYLON.MeshBuilder.CreateCylinder('marker2', markerOptions, self.scene);
    self.marker2.material = redMat;
    self.marker2.isPickable = false;
    self.marker2.isVisible = false;

    // Load world and robot
    let loader = [];
    loader.push(self.world.load(self.scene));
    robots.forEach(function (robot) {
      if (robot.player == 'single') {
        loader.push(robot.load(self.scene, self.world.robotStart));
      } else {
        if (robot.disabled == true) {
          return;
        }
        loader.push(robot.load(self.scene, self.world.arenaStart[robot.player]));
      }
    });

    return Promise.all(loader).then(function () {
      self.setCameraMode(); // Set after loading mesh as camera may be locked to mesh

      // For camera visualization
      self.rttViewMat = self.scene.getMaterialByID("RTT mat");
      if (!self.rttViewMat) {
        self.rttViewMat = new BABYLON.StandardMaterial("RTT mat", self.scene);
        self.rttViewMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        self.rttViewMat.disableLighting = true;
      }
      // self.rttViewMat.diffuseTexture = robot.getComponentByPort('in1').renderTarget;

      self.rttView = BABYLON.MeshBuilder.CreateGround("RTT", { width: 1, height: 1 }, self.scene);
      self.rttView.rotation.x = -Math.PI / 2;
      self.rttView.position.x = 0;
      self.rttView.position.y = 2;
      self.rttView.position.z = 8;
      self.rttView.material = self.rttViewMat;
      self.rttView.parent = self.cameraArc;
      self.rttView.setEnabled(false);

      // Some components in the robot may need to see the fully loaded meshes
      robots.forEach(function (robot) {
        if (robot.disabled == true) {
          return;
        }
        robot.loadMeshes(self.scene.meshes.filter(mesh => mesh.id != 'RTT' && mesh.id != 'marker1' && mesh.id != 'marker2'));
      })

      // BabylonJS 8.x INCOMPATIBILITY: material.clone() permanently corrupts
      // the original material's WebGL shader programs. clone() shares internal
      // Effect references, and modifying the clone (disableLighting + freeze)
      // causes the shared WebGL program to be deleted/replaced.
      // RTT materials are now created lazily when camera sensor is activated,
      // instead of pre-building them here.
      self.scene.meshes.forEach(function (mesh) {
        mesh.origMaterial = mesh.material;
        mesh.rttMaterial = mesh.material; // Will be properly created on demand
      });

      // Reset the world if needed
      if (self.world.reset) {
        self.world.reset();
      }

      self.scene.actionManager = new BABYLON.ActionManager(self.scene);
      self.scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction({
          trigger: BABYLON.ActionManager.OnEveryFrameTrigger
        },
          self.render
        )
      );
    });
  };

  // Get color3 from hex
  this.hexToColor3 = function (rgba) {
    rgba = rgba.replace(/^#/g, '');
    let color = '#';

    if (rgba.length == 3 || rgba.length == 4) {
      color += rgba[0] + rgba[0];
      color += rgba[1] + rgba[1];
      color += rgba[2] + rgba[2];
    } else if (rgba.length == 6 || rgba.length == 8) {
      color += rgba[0] + rgba[1];
      color += rgba[2] + rgba[3];
      color += rgba[4] + rgba[5];
    }

    return BABYLON.Color3.FromHexString(color);
  };

  // Get material from rgba string, creating new if not existing
  this.getMaterial = function (scene, rgba) {
    rgba = rgba.replace(/^#/g, '');
    let color = new Array(4);

    let existing = scene.getMaterialByID(rgba);
    if (existing) {
      return existing;
    }

    let mat = new BABYLON.StandardMaterial(rgba, scene);

    mat.diffuseColor = self.hexToColor3(rgba);

    if (rgba.length == 4) {
      color[3] = parseInt(rgba[3] + rgba[3], 16) / 255;
    } else if (rgba.length == 8) {
      color[3] = parseInt(rgba[6] + rgba[7], 16) / 255;
    } else {
      color[3] = 1;
    }

    mat.alpha = color[3];
    mat.freeze();

    return mat;
  };

  // Change material for a mesh, including handling for rtt material
  // BabylonJS 8.x FIX: material.clone() shares internal Effect references,
  // causing the original material's WebGL programs to be deleted when the
  // clone is modified. We now create a fresh independent material instead.
  this.setMaterial = function (mesh, material) {
    mesh.material = material;
    mesh.isFrozen = false;

    let rttID = 'RTT_' + mesh.material.id;
    let mat = self.scene.getMaterialByID(rttID);
    if (mat == null) {
      // Create a new independent material instead of cloning
      let rttMat = new BABYLON.StandardMaterial(rttID, self.scene);
      rttMat.disableLighting = true;
      if (mesh.material.diffuseTexture) {
        rttMat.diffuseTexture = mesh.material.diffuseTexture;
        rttMat.emissiveColor = typeof FULL_EMMISSIVE !== 'undefined' ? FULL_EMMISSIVE : new BABYLON.Color3(1, 1, 1);
      } else if (mesh.material.albedoColor) {
        rttMat.emissiveColor = mesh.material.albedoColor;
      } else if (mesh.material.diffuseColor) {
        rttMat.emissiveColor = mesh.material.diffuseColor;
      } else {
        rttMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
      }
      if (mesh.material.alpha !== undefined) {
        rttMat.alpha = mesh.material.alpha;
      }
      rttMat.freeze();
      mesh.rttMaterial = rttMat;
    } else {
      mesh.rttMaterial = mat;
    }

    delete mesh._rtt_subMeshEffects;
  };

  // List of render functions to call
  this.renders = [];

  // Render loop
  this.render = function () {
    var delta = self.scene.getEngine().getDeltaTime();

    if (typeof simPanel != 'undefined' && simPanel.showFPS) {
      simPanel.$fps.text(self.engine.getFps().toFixed() + " fps");
    }
    if (typeof arenaPanel != 'undefined' && arenaPanel.showFPS) {
      arenaPanel.$fps.text(self.engine.getFps().toFixed() + " fps");
    }

    robots.forEach(function (robot) {
      if (robot.disabled == true) {
        return;
      }
      robot.render(delta);
    });

    if (self.world.render) {
      self.world.render(delta);
    }

    self.renders.forEach(function (render) {
      render(delta);
    });
  };
}

// Lazy init: only load Ammo.js on DOMContentLoaded.
// babylon.init() itself is deferred until the Simulator tab is first clicked,
// ensuring the canvas is visible and properly sized when WebGL initializes.
// This prevents BabylonJS 8.x from creating and immediately GC-ing GPU programs.
//
// EXCEPTION: On configurator.html and builder.html, the canvas is always visible
// (no Simulator tab exists), so babylon must be initialized immediately after
// Ammo.js is ready.
window.addEventListener("DOMContentLoaded", function () {
  var config = {
    locateFile: () => 'ammo/ammo-20210414.wasm.wasm'
  };
  Ammo(config).then(function (ammo) {
    babylon._ammoInstance = ammo;

    // Check if we are on configurator or builder page (canvas is always visible)
    var isConfigurator = typeof configurator !== 'undefined';
    var isBuilder = typeof builder !== 'undefined';

    if (isConfigurator || isBuilder) {
      // Canvas is always visible on these pages - init immediately
      try {
        babylon.simActive = true;
        babylon.init();
        babylon.engine.resize();
        setTimeout(function () { babylon.engine.resize(); }, 500);
      } catch (e) {
        console.error('[GEARS] babylon.init() error:', e);
      }
    }
  }).catch(function (e) {
    console.error('[GEARS] Ammo init error:', e);
  });
});
