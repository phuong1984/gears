// Shared ModelLoader for gears project
// Provides: detectFileExtension, prepareURLForLoading, calculateBoundingInfo, loadModel,
// applyModelColor, positionModel
(function (global) {
  'use strict';

  function extractExtension(path) {
    if (!path) return null;
    var idx = path.lastIndexOf('.');
    if (idx < 0) return null;
    var ext = path.substring(idx).toLowerCase();
    if (ext === '.stl' || ext === '.glb' || ext === '.gltf') return ext;
    return null;
  }

  function detectFileExtension(url, fileName) {
    var ext = extractExtension(fileName || '');
    if (ext) return ext;
    if (url && !url.startsWith('blob:') && !url.startsWith('data:')) {
      var clean = url.split('?')[0].split('#')[0];
      ext = extractExtension(clean);
      if (ext) return ext;
    }
    if (url && url.startsWith('data:')) {
      if (url.indexOf('model/stl') !== -1 || url.indexOf('application/sla') !== -1 || url.indexOf('application/octet-stream') !== -1) return '.stl';
      if (url.indexOf('model/gltf-binary') !== -1 || url.indexOf('application/gltf+binary') !== -1) return '.glb';
      if (url.indexOf('model/gltf+json') !== -1 || url.indexOf('application/gltf+json') !== -1) return '.gltf';
    }
    return '.glb';
  }

  async function prepareURLForLoading(url, extension) {
    var tempBlobUrl = null;
    if (extension === '.stl' && url && url.startsWith('data:')) {
      var response = await fetch(url);
      var blob = await response.blob();
      tempBlobUrl = URL.createObjectURL(blob);
      return { url: tempBlobUrl, tempBlobUrl: tempBlobUrl };
    }
    return { url: url, tempBlobUrl: null };
  }

  function calculateBoundingInfo(meshes, modelScale) {
    modelScale = modelScale || 1;
    var min = null, max = null;
    try {
      if (meshes.length > 0 && typeof meshes[0].getHierarchyBoundingVectors === 'function') {
        var b = meshes[0].getHierarchyBoundingVectors(true);
        min = b.min.clone();
        max = b.max.clone();
      }
    } catch (e) { }

    if (!min || !max) {
      for (var i = 0; i < meshes.length; i++) {
        try {
          meshes[i].computeWorldMatrix(true);
          var meshBounds = meshes[i].getBoundingInfo().boundingBox;
          if (meshBounds.extendSize.x === 0 && meshBounds.extendSize.y === 0 && meshBounds.extendSize.z === 0) continue;
          if (!min) {
            min = meshBounds.minimumWorld.clone();
            max = meshBounds.maximumWorld.clone();
          } else {
            min = BABYLON.Vector3.Minimize(min, meshBounds.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, meshBounds.maximumWorld);
          }
        } catch (e) { }
      }
    }

    if (!min || !max) {
      min = new BABYLON.Vector3(-1, -1, -1);
      max = new BABYLON.Vector3(1, 1, 1);
    }

    var center = BABYLON.Vector3.Center(min, max);
    var size = {
      x: (max.x - min.x) * modelScale,
      y: (max.y - min.y) * modelScale,
      z: (max.z - min.z) * modelScale
    };

    return { center: center, size: size, extents: { x: size.x / 2, y: size.y / 2, z: size.z / 2 } };
  }

  async function loadModel(opts) {
    var scene = opts.scene;
    var url = opts.url;
    var fileName = opts.fileName || '';
    var modelScale = opts.modelScale || 1;

    var result = { meshes: [], animationGroups: [], extension: '.glb', boundingInfo: null, isSTL: false, error: null };
    if (!scene || !url) {
      result.error = new Error('Missing scene or url');
      return result;
    }

    result.extension = detectFileExtension(url, fileName);
    result.isSTL = (result.extension === '.stl');

    var prep;
    try {
      prep = await prepareURLForLoading(url, result.extension);
    } catch (err) {
      result.error = err;
      return result;
    }

    var tempBlob = prep.tempBlobUrl;
    try {
      var loadResults = await BABYLON.SceneLoader.ImportMeshAsync(null, '', prep.url, scene, null, result.extension);
      result.meshes = loadResults.meshes || [];
      result.animationGroups = loadResults.animationGroups || [];
    } catch (err) {
      result.error = err;
      if (tempBlob) URL.revokeObjectURL(tempBlob);
      return result;
    }

    if (tempBlob) {
      URL.revokeObjectURL(tempBlob);
    }

    if (result.meshes.length > 0) {
      try {
        result.boundingInfo = calculateBoundingInfo(result.meshes, modelScale);
      } catch (e) {
        result.boundingInfo = { center: BABYLON.Vector3.Zero(), size: { x: 2, y: 2, z: 2 } };
      }
    }

    return result;
  }

  function applyModelColor(meshes, colorHex, isSTL, scene) {
    if (!colorHex || colorHex === '') return;
    if (colorHex[0] !== '#') colorHex = '#' + colorHex;
    colorHex = colorHex.substring(0, 7);
    var color3 = BABYLON.Color3.FromHexString(colorHex);
    var start = isSTL ? 0 : 1;
    for (var i = start; i < meshes.length; i++) {
      try {
        var newMat = new BABYLON.StandardMaterial('modelColor_' + i, scene);
        newMat.diffuseColor = color3;
        meshes[i].material = newMat;
      } catch (e) { }
    }
  }

  function positionModel(meshes, centerBJS, modelScale, isSTL, bodyMesh) {
    if (!meshes || meshes.length === 0) return;
    var offBJS = new BABYLON.Vector3(-centerBJS.x * modelScale, -centerBJS.y * modelScale, centerBJS.z * modelScale);
    if (isSTL) {
      var stlRoot = new BABYLON.TransformNode('stlRoot_model', bodyMesh.getScene());
      stlRoot.scaling = new BABYLON.Vector3(modelScale, modelScale, -modelScale);
      stlRoot.position = offBJS;
      stlRoot.parent = bodyMesh;
      for (var i = 0; i < meshes.length; i++) meshes[i].parent = stlRoot;
    } else {
      meshes[0].rotationQuaternion = null;
      meshes[0].scaling = new BABYLON.Vector3(modelScale, modelScale, -modelScale);
      meshes[0].position = offBJS;
      meshes[0].parent = bodyMesh;
      meshes[0].visibility = 0;
    }
  }

  global.ModelLoader = {
    detectFileExtension: detectFileExtension,
    prepareURLForLoading: prepareURLForLoading,
    calculateBoundingInfo: calculateBoundingInfo,
    loadModel: loadModel,
    applyModelColor: applyModelColor,
    positionModel: positionModel
  };

})(window);
