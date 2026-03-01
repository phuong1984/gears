/* public/js/common/snapPointEditor.js */
class SnapPointEditorClass {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.light = null;

        this.originalMesh = null; // The mesh in the main scene
        this.editorMesh = null; // Mesh in the editor scene (root)
        this.componentData = null; // System component data
        this.modelURL = null;
        this.componentType = null; // Component type for DB lookup
        this.isBuiltIn = false;

        this.snapPoints = [];
        this.selectedPointIndex = -1;
        this.pointMarkers = []; // Mesh markers in the editor scene
        this._modelSize = 1; // Estimated size for marker scaling

        // Hover preview state
        this._lastPickResult = null;
        this._previewMarker = null;
        this._previewNormal = null;

        this.ui = {};
    }

    /**
     * Mở Snap Point Editor
     * @param {object} options
     * - mesh: BABYLON.Mesh đang được chọn ngoài scene chính
     * - componentData: Dữ liệu component hiện tại
     * - modelURL: (optional) override URL
     */
    open(options) {
        if (!options.mesh) return;

        console.log('[SnapEditor] open() called', {
            mesh: options.mesh?.name,
            componentData: options.componentData,
            modelURL: options.modelURL
        });

        this.originalMesh = options.mesh;
        this.componentData = options.componentData || {};
        this._onSaveCallback = options.onSave || null;
        this.modelURL = options.modelURL
            || this.componentData.options?.modelURL
            || this.componentData.modelURL
            || null;
        this.componentType = this.componentData.type || null;

        console.log('[SnapEditor] resolved:', {
            modelURL: this.modelURL,
            componentType: this.componentType,
            isBuiltIn: this.isBuiltIn
        });

        // Kiểm tra xem có phải Built-in không
        this.isBuiltIn = this.modelURL
            && typeof BUILT_IN_MODELS !== 'undefined'
            && Array.isArray(BUILT_IN_MODELS)
            && BUILT_IN_MODELS.some(m => m.url === this.modelURL);

        // Also check if this component type is in SNAP_POINTS_DB (e.g., 'UltrasonicSensor')
        this.isBuiltInComponent = !this.isBuiltIn
            && this.componentType
            && typeof SNAP_POINTS_DB !== 'undefined'
            && (SNAP_POINTS_DB[this.componentType] !== undefined);

        if (!this.modelURL && this.componentData.options?.isFileUpload) {
            this.isBuiltIn = false;
            this.isBuiltInComponent = false;
        }

        try {
            this._loadExistingData();
            this._createUI();
            this._initBabylon();
            this._setupMeshAndCamera();
        } catch (e) {
            console.error('[SnapEditor] Error in open():', e);
        }
    }

    close() {
        if (this._axesEngine) {
            this._axesEngine.dispose();
            this._axesEngine = null;
        }
        if (this._axesContainer && this._axesContainer.parentNode) {
            this._axesContainer.parentNode.removeChild(this._axesContainer);
            this._axesContainer = null;
        }
        // Cleanup preview marker
        if (this._previewMarker) { this._previewMarker.dispose(); this._previewMarker = null; }
        if (this._previewNormal) { this._previewNormal.dispose(); this._previewNormal = null; }
        this._lastPickResult = null;
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        // Cleanup event listeners
        if (this._onResize) {
            window.removeEventListener("resize", this._onResize);
            this._onResize = null;
        }
        if (this._onKeyDown) {
            document.removeEventListener("keydown", this._onKeyDown);
            this._onKeyDown = null;
        }
        this.container = null;
        this.scene = null;
        this.editorMesh = null;
        this.pointMarkers = [];
        this.selectedPointIndex = -1;
    }

    _loadExistingData() {
        this.snapPoints = [];

        // 1. Built-in model: ưu tiên localStorage, sau đó DB gốc (by modelURL)
        if (this.isBuiltIn && this.modelURL) {
            const localKey = 'snap_custom_' + this.modelURL;
            const localData = localStorage.getItem(localKey);
            if (localData) {
                try {
                    this.snapPoints = JSON.parse(localData);
                    return;
                } catch (e) { console.error(e); }
            } else if (typeof SNAP_POINTS_DB !== 'undefined' && SNAP_POINTS_DB[this.modelURL]) {
                const dbData = SNAP_POINTS_DB[this.modelURL].snapPoints;
                if (dbData) {
                    this.snapPoints = JSON.parse(JSON.stringify(dbData));
                    return;
                }
            }
        }

        // 1b. Body: check user-defined bodySnapPoints
        if (this.componentType === '__body__' && this.componentData?.options?.bodySnapPoints) {
            let pts = this.componentData.options.bodySnapPoints;
            if (pts.length > 0) {
                // Saved positions include bodyModelScale; editor shows at native scale
                let scale = (this.componentData?.options?.bodyModelScale) || 1;
                this.snapPoints = pts.map(p => {
                    let lp = p.localPos || p.position || [0, 0, 0];
                    return {
                        name: p.name,
                        role: p.role || 'surface',
                        position: [lp[0] / scale, lp[1] / scale, lp[2] / scale],
                        normal: [...(p.normal || [0, 0, 1])]
                    };
                });
                return;
            }
        }

        // 2. Lookup by component type (e.g., 'UltrasonicSensor', 'ColorSensor')
        // Skip __body__ here — body model in editor is at native scale, not bodyModelScale
        if (this.componentType && this.componentType !== '__body__' && typeof SNAP_POINTS_DB !== 'undefined' && SNAP_POINTS_DB[this.componentType]) {
            let dbEntry = SNAP_POINTS_DB[this.componentType];
            let pts;
            if (dbEntry.dynamic && typeof dbEntry.getSnapPoints === 'function') {
                pts = dbEntry.getSnapPoints(this.componentData.options || {});
            } else {
                pts = dbEntry.snapPoints;
            }
            if (pts && pts.length > 0) {
                // DB uses localPos/normal format, editor uses position/normal
                this.snapPoints = pts.map(p => ({
                    name: p.name,
                    role: p.role || 'surface',
                    position: [...(p.localPos || p.position || [0, 0, 0])],
                    normal: [...(p.normal || [0, 0, 1])]
                }));
                return;
            }
        }

        // 3. Primitive type lookup (e.g., '__primitive__/Box')
        if (this.componentType && typeof SNAP_POINTS_DB !== 'undefined') {
            let primKey = '__primitive__/' + this.componentType.replace(/Block$/, '').replace(/Sensor$|Actuator$/, '');
            if (SNAP_POINTS_DB[primKey]) {
                let dbEntry = SNAP_POINTS_DB[primKey];
                let pts;
                if (dbEntry.dynamic && typeof dbEntry.getSnapPoints === 'function') {
                    pts = dbEntry.getSnapPoints(this.componentData.options || {});
                } else {
                    pts = dbEntry.snapPoints;
                }
                if (pts && pts.length > 0) {
                    this.snapPoints = pts.map(p => ({
                        name: p.name,
                        role: p.role || 'surface',
                        position: [...(p.localPos || p.position || [0, 0, 0])],
                        normal: [...(p.normal || [0, 0, 1])]
                    }));
                    return;
                }
            }
        }

        // 4. User Imported: load từ componentData
        if (this.componentData?.options?.snapPoints) {
            let pts = this.componentData.options.snapPoints;
            this.snapPoints = pts.map(p => ({
                name: p.name,
                role: p.role || 'surface',
                position: [...(p.localPos || p.position || [0, 0, 0])],
                normal: [...(p.normal || [0, 0, 1])]
            }));
            return;
        }

        // 5. Fallback: Auto-generate from bounding box (same as SnapManager.getAutoSnapPoints)
        // SKIP when component has a model URL — originalMesh is the invisible primitive box,
        // not the loaded GLB. The editor will load the actual model via _setupMeshAndCamera,
        // and auto-generate from its real bounding box in onMeshReady.
        if (this.modelURL) {
            // Component with model URL: leave snapPoints empty, will auto-generate after model loads.
            console.log('[SnapEditor] Component with model URL — skipping box fallback, auto-gen after load');
        } else if (this.originalMesh) {
            try {
                this.originalMesh.computeWorldMatrix(true);
                let bb = this.originalMesh.getBoundingInfo().boundingBox;
                let ext = bb.extendSize;
                // BJS extendSize: x=X, y=Y(up), z=Z(forward)
                // Descartes (editor): X=x, Y=z(forward), Z=y(up)
                let ex = ext.x;
                let ey = ext.z;
                let ez = ext.y;
                this.snapPoints = [
                    { name: 'top', role: 'surface', position: [0, 0, ez], normal: [0, 0, 1] },
                    { name: 'bottom', role: 'surface', position: [0, 0, -ez], normal: [0, 0, -1] },
                    { name: 'front', role: 'surface', position: [0, ey, 0], normal: [0, 1, 0] },
                    { name: 'back', role: 'surface', position: [0, -ey, 0], normal: [0, -1, 0] },
                    { name: 'right', role: 'surface', position: [ex, 0, 0], normal: [1, 0, 0] },
                    { name: 'left', role: 'surface', position: [-ex, 0, 0], normal: [-1, 0, 0] }
                ];
            } catch (e) {
                console.warn('[SnapEditor] Could not auto-generate snap points from bounding box', e);
            }
        }
    }

    _createUI() {
        if (this.container) this.close();

        this.container = document.createElement('div');
        this.container.className = 'snap-editor-overlay';

        const sourceModeLabel = this.isBuiltIn ? 'Built-in Library' : (this.isBuiltInComponent ? 'Built-in Component' : 'User Imported');
        const sourceModeClass = (this.isBuiltIn || this.isBuiltInComponent) ? 'builtin' : 'user';

        // Hiện tên thân thiện từ modelURL hoặc mesh name
        let displayName = this.originalMesh.name || 'Unknown';
        if (this.modelURL) {
            displayName = this.modelURL.split('/').pop() || displayName;
        }
        if (this.componentData?.type) {
            displayName = this.componentData.type + (this.modelURL ? ' (' + displayName + ')' : '');
        }

        this.container.innerHTML = `
            <div class="snap-editor-modal">
                <div class="snap-editor-header">
                    <h3>Snap Point Editor — ${displayName}</h3>
                    <button class="close-btn" id="snap-editor-close">&times;</button>
                </div>
                <div class="snap-editor-body">
                    <div class="snap-editor-viewport">
                        <canvas id="snap-editor-canvas"></canvas>
                        <div class="snap-editor-hints">
                            <i class="fas fa-arrows-alt"></i> Kéo chuột trái xoay &nbsp;|&nbsp; Scroll thu/phóng<br>
                            <i class="fas fa-crosshairs"></i> Di chuột lên bề mặt → <b>Click</b> hoặc nhấn <kbd>A</kbd> để thêm Snap Point
                        </div>
                        <div class="snap-editor-loading" id="snap-editor-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#aaa;font-size:1rem;pointer-events:none;">
                            <i class="fas fa-spinner fa-spin"></i> Đang tải model...
                        </div>
                    </div>
                    <div class="snap-editor-sidebar">
                        <div class="snap-editor-sidebar-section">
                            <span class="snap-editor-source-badge ${sourceModeClass}">${sourceModeLabel}</span>
                            <div class="snap-editor-toolbox">
                                <button id="snap-btn-auto-bbox" title="Sinh 6 điểm ở 6 mặt của Bounding Box"><i class="fas fa-box"></i> Auto từ BBox</button>
                                <button id="snap-btn-clear" title="Xóa toàn bộ điểm"><i class="fas fa-trash"></i> Clear All</button>
                            </div>
                        </div>
                        <div class="snap-editor-list" id="snap-point-list">
                            <!-- List items -->
                        </div>
                        <div class="snap-editor-properties" id="snap-point-props" style="display: none;">
                            <div class="snap-editor-prop-row">
                                <label>Name</label>
                                <input type="text" id="snap-prop-name">
                            </div>
                            <div class="snap-editor-prop-row">
                                <label>Role</label>
                                <select id="snap-prop-role">
                                    <option value="surface">surface</option>
                                    <option value="attach">attach</option>
                                    <option value="mount">mount</option>
                                    <option value="axle">axle</option>
                                </select>
                                <span class="snap-role-note" id="snap-role-note"></span>
                            </div>
                            <div class="snap-editor-prop-row">
                                <label>Local Position [X, Y, Z] (Descartes)</label>
                                <div class="snap-vector-input">
                                    <input type="number" step="0.01" id="snap-prop-px" placeholder="X">
                                    <input type="number" step="0.01" id="snap-prop-py" placeholder="Y">
                                    <input type="number" step="0.01" id="snap-prop-pz" placeholder="Z">
                                </div>
                            </div>
                            <div class="snap-editor-prop-row">
                                <label>Normal Direction [X, Y, Z] (Descartes)</label>
                                <div class="snap-vector-input">
                                    <input type="number" step="0.1" id="snap-prop-nx" placeholder="X">
                                    <input type="number" step="0.1" id="snap-prop-ny" placeholder="Y">
                                    <input type="number" step="0.1" id="snap-prop-nz" placeholder="Z">
                                </div>
                            </div>
                            <button class="snap-btn-danger" id="snap-btn-delete-point"><i class="fas fa-trash"></i> Delete Point</button>
                        </div>
                    </div>
                </div>
                <div class="snap-editor-footer">
                    ${(this.isBuiltIn || this.isBuiltInComponent) ? '<button class="snap-btn-secondary" id="snap-btn-copy"><i class="fas fa-copy"></i> Copy Code for DB</button>' : ''}
                    <button class="snap-btn-primary" id="snap-btn-save"><i class="fas fa-save"></i> Save &amp; Apply</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        this.canvas = document.getElementById('snap-editor-canvas');

        // References
        this.ui.list = document.getElementById('snap-point-list');
        this.ui.propsPanel = document.getElementById('snap-point-props');

        // Property inputs
        this.ui.inpName = document.getElementById('snap-prop-name');
        this.ui.inpRole = document.getElementById('snap-prop-role');
        this.ui.roleNote = document.getElementById('snap-role-note');
        this.ui.inpPx = document.getElementById('snap-prop-px');
        this.ui.inpPy = document.getElementById('snap-prop-py');
        this.ui.inpPz = document.getElementById('snap-prop-pz');
        this.ui.inpNx = document.getElementById('snap-prop-nx');
        this.ui.inpNy = document.getElementById('snap-prop-ny');
        this.ui.inpNz = document.getElementById('snap-prop-nz');

        // Event listeners
        document.getElementById('snap-editor-close').addEventListener('click', () => this.close());
        document.getElementById('snap-btn-auto-bbox').addEventListener('click', () => this._autoFromBBox());
        document.getElementById('snap-btn-clear').addEventListener('click', () => {
            if (confirm('Xóa tất cả các điểm?')) {
                this.snapPoints = [];
                this.selectedPointIndex = -1;
                this._refreshPointList();
                this._refreshMarkers();
            }
        });

        let copyBtn = document.getElementById('snap-btn-copy');
        if (copyBtn) copyBtn.addEventListener('click', () => this._copyToClipboard());
        document.getElementById('snap-btn-save').addEventListener('click', () => this._saveAndApply());
        document.getElementById('snap-btn-delete-point').addEventListener('click', () => this._deleteSelectedPoint());

        // Role notes
        const roleNotes = {
            'surface': 'Bề mặt phẳng của vật rắn (vd: lưng box). Có thể snap với surface hoặc attach.',
            'attach': 'Điểm có tính chất bám vào bề mặt khối khác (vd: đáy cảm biến). Ưu tiên bám vào surface/mount.',
            'mount': 'Điểm ngàm, trục nhô ra để linh kiện khác gắn vào. Nhận attach.',
            'axle': 'Trục xoay. Chỉ snap với axle khác (vd: tâm bánh xe cắm vào trục motor).'
        };
        this.ui.inpRole.addEventListener('change', (e) => {
            this.ui.roleNote.innerText = roleNotes[e.target.value] || '';
            this._updateSelectedPointProp('role', e.target.value);
        });

        const textChangeOptions = ['name', 'px', 'py', 'pz', 'nx', 'ny', 'nz'];
        textChangeOptions.forEach(prop => {
            let el = document.getElementById('snap-prop-' + prop);
            el.addEventListener('change', (e) => this._handlePropInputChange(prop, e.target.value));
            if (['px', 'py', 'pz', 'nx', 'ny', 'nz'].includes(prop)) {
                el.addEventListener('input', (e) => this._handlePropInputChange(prop, e.target.value));
            }
        });
    }

    _handlePropInputChange(prop, value) {
        if (this.selectedPointIndex === -1) return;
        let pt = this.snapPoints[this.selectedPointIndex];

        if (prop === 'name') {
            pt.name = value;
            this._refreshPointList();
        } else {
            let numFlag = parseFloat(value) || 0;
            switch (prop) {
                case 'px': pt.position[0] = numFlag; break;
                case 'py': pt.position[1] = numFlag; break;
                case 'pz': pt.position[2] = numFlag; break;
                case 'nx': pt.normal[0] = numFlag; break;
                case 'ny': pt.normal[1] = numFlag; break;
                case 'nz': pt.normal[2] = numFlag; break;
            }
            this._updateMarkerTransform(this.selectedPointIndex);
        }
    }

    _updateSelectedPointProp(key, value) {
        if (this.selectedPointIndex === -1) return;
        this.snapPoints[this.selectedPointIndex][key] = value;
        this._refreshPointList();
        this._refreshMarkers();
    }

    _initBabylon() {
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.12, 0.12, 0.15, 1);

        this.camera = new BABYLON.ArcRotateCamera("editorCamera",
            -Math.PI / 4, Math.PI / 3, 5, BABYLON.Vector3.Zero(), this.scene);
        this.camera.attachControl(this.canvas, true);
        this.camera.wheelPrecision = 50;
        this.camera.minZ = 0.01;
        this.camera.lowerRadiusLimit = 0.1;
        this.camera.zoomToMouseLocation = true;

        // Lighting
        let hLight = new BABYLON.HemisphericLight("editorHLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        hLight.intensity = 0.7;
        hLight.diffuse = new BABYLON.Color3(1, 1, 1);
        hLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.4);

        let pLight = new BABYLON.DirectionalLight("editorDLight", new BABYLON.Vector3(-1, -2, -1), this.scene);
        pLight.intensity = 0.5;

        // Hover detection → Preview marker + cursor change
        // Click (no drag) on surface → add snap point
        // Click on marker → select marker
        let _pointerDownPos = null; // Track POINTERDOWN position to distinguish click vs drag

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                // Ray pick only editor mesh (exclude markers)
                let pickResult = this.scene.pick(
                    this.scene.pointerX,
                    this.scene.pointerY,
                    (mesh) => this._isEditorMesh(mesh) && !mesh.isMarker
                );

                if (pickResult && pickResult.hit) {
                    this._lastPickResult = pickResult;
                    this.canvas.style.cursor = 'crosshair';
                    this._updatePreviewMarker(pickResult);
                } else {
                    this._lastPickResult = null;
                    this.canvas.style.cursor = 'default';
                    this._hidePreviewMarker();
                }
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                // Save position to detect drag vs click
                _pointerDownPos = { x: this.scene.pointerX, y: this.scene.pointerY };

                // Click vào marker để select (immediate on down)
                if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedMesh.isMarker) {
                    let idx = pointerInfo.pickInfo.pickedMesh.pointIndex;
                    this._selectPoint(idx);
                    _pointerDownPos = null; // Don't also add a point on mouseup
                }
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                // Compare with down position: if distance < 5px → click (not drag)
                if (_pointerDownPos && this._lastPickResult) {
                    let dx = this.scene.pointerX - _pointerDownPos.x;
                    let dy = this.scene.pointerY - _pointerDownPos.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 5) {
                        this._addPointFromPick(this._lastPickResult);
                    }
                }
                _pointerDownPos = null;
            }
        });

        this.engine.runRenderLoop(() => {
            if (this.scene) this.scene.render();
        });

        window.addEventListener("resize", this._onResize = () => {
            if (this.engine) this.engine.resize();
        });

        // Keyboard: Escape to close, A to add snap point at cursor
        document.addEventListener("keydown", this._onKeyDown = (e) => {
            // Don't trigger when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (e.key === 'Escape') {
                this.close();
            } else if ((e.key === 'a' || e.key === 'A') && this._lastPickResult) {
                this._addPointFromPick(this._lastPickResult);
            }
        });
        // Create axes indicator
        this._createAxesIndicator();
    }

    /**
     * Create a 3D axes indicator in the bottom-left corner of the editor viewport.
     * Shows X(red), Y(green), Z(blue) arrows synced with the main camera rotation.
     * Uses Descartes convention: X=right, Y=forward, Z=up.
     */
    _createAxesIndicator() {
        // Create a second viewport in bottom-left corner
        let axesSize = 120; // px size

        // Create a container div for the axes viewport
        let axesContainer = document.createElement('div');
        axesContainer.className = 'snap-editor-axes';
        axesContainer.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            width: ${axesSize}px;
            height: ${axesSize}px;
            pointer-events: none;
            z-index: 10;
        `;

        let axesCanvas = document.createElement('canvas');
        axesCanvas.width = axesSize * (window.devicePixelRatio || 1);
        axesCanvas.height = axesSize * (window.devicePixelRatio || 1);
        axesCanvas.style.cssText = `width: ${axesSize}px; height: ${axesSize}px;`;
        axesContainer.appendChild(axesCanvas);

        let viewportEl = this.canvas.parentElement;
        viewportEl.appendChild(axesContainer);

        // Create axes engine and scene
        let axesEngine = new BABYLON.Engine(axesCanvas, true, { preserveDrawingBuffer: true, stencil: false });
        let axesScene = new BABYLON.Scene(axesEngine);
        axesScene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparent

        let axesCam = new BABYLON.ArcRotateCamera("axesCam",
            this.camera.alpha, this.camera.beta, 5,
            BABYLON.Vector3.Zero(), axesScene);
        axesCam.minZ = 0.01;

        // Simple lighting
        let axesLight = new BABYLON.HemisphericLight("axesLight", new BABYLON.Vector3(0, 1, 0), axesScene);
        axesLight.intensity = 1.0;

        // Create axis lines and arrows (Descartes: X=BJS_X, Y=BJS_Z, Z=BJS_Y)
        let axisLen = 1.5;
        let arrowSize = 0.15;

        // Helper: create one axis arrow
        const createAxis = (name, dir, color) => {
            let mat = new BABYLON.StandardMaterial("axisMat_" + name, axesScene);
            mat.emissiveColor = color;
            mat.disableLighting = true;

            // Shaft (thin cylinder)
            let shaft = BABYLON.MeshBuilder.CreateCylinder("axisShaft_" + name, {
                height: axisLen,
                diameterTop: 0.04,
                diameterBottom: 0.04
            }, axesScene);
            shaft.material = mat;

            // Cone tip
            let cone = BABYLON.MeshBuilder.CreateCylinder("axisCone_" + name, {
                height: arrowSize * 2,
                diameterTop: 0,
                diameterBottom: arrowSize
            }, axesScene);
            cone.material = mat;

            // Position along direction
            let halfLen = axisLen / 2;
            let axisY = new BABYLON.Vector3(0, 1, 0);
            let dot = BABYLON.Vector3.Dot(axisY, dir);

            if (Math.abs(dot) < 0.9999) {
                let cross = BABYLON.Vector3.Cross(axisY, dir).normalize();
                let angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                shaft.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross, angle);
                cone.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross, angle);
            } else if (dot < 0) {
                shaft.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
                cone.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
            }

            shaft.position = dir.scale(halfLen);
            cone.position = dir.scale(axisLen);

            // Label using DynamicTexture
            let labelPlane = BABYLON.MeshBuilder.CreatePlane("axisLabel_" + name, { size: 0.5 }, axesScene);
            let labelTex = new BABYLON.DynamicTexture("axisLabelTex_" + name, { width: 64, height: 64 }, axesScene);
            let labelMat = new BABYLON.StandardMaterial("axisLabelMat_" + name, axesScene);
            labelMat.diffuseTexture = labelTex;
            labelMat.emissiveTexture = labelTex;
            labelMat.disableLighting = true;
            labelMat.backFaceCulling = false;
            labelMat.useAlphaFromDiffuseTexture = true;
            labelTex.hasAlpha = true;
            labelPlane.material = labelMat;
            labelPlane.position = dir.scale(axisLen + 0.35);
            labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            // Draw label text
            let ctx = labelTex.getContext();
            ctx.clearRect(0, 0, 64, 64);
            ctx.font = "bold 48px Arial";
            ctx.fillStyle = color.toHexString();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(name, 32, 32);
            labelTex.update();

            return { shaft, cone, labelPlane };
        };

        // Descartes axes in BabylonJS space:
        // Descartes X = BJS X (red)
        // Descartes Y = BJS Z (green) 
        // Descartes Z = BJS Y (blue)
        createAxis("X", new BABYLON.Vector3(1, 0, 0), new BABYLON.Color3(1, 0.2, 0.2));
        createAxis("Y", new BABYLON.Vector3(0, 0, 1), new BABYLON.Color3(0.2, 0.8, 0.2));
        createAxis("Z", new BABYLON.Vector3(0, 1, 0), new BABYLON.Color3(0.3, 0.5, 1));

        // Small center sphere
        let centerSphere = BABYLON.MeshBuilder.CreateSphere("axesCenter", { diameter: 0.15 }, axesScene);
        let centerMat = new BABYLON.StandardMaterial("axesCenterMat", axesScene);
        centerMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        centerMat.disableLighting = true;
        centerSphere.material = centerMat;

        // Sync axes camera with main camera
        axesEngine.runRenderLoop(() => {
            if (this.camera && axesScene) {
                axesCam.alpha = this.camera.alpha;
                axesCam.beta = this.camera.beta;
                axesScene.render();
            }
        });

        // Store for cleanup
        this._axesEngine = axesEngine;
        this._axesContainer = axesContainer;
    }

    /**
     * BUG FIX 1: Thay thế SceneSerializer bằng load từ modelURL (hoặc clone primitive)
     * SceneSerializer không hoạt động với GLB (binary geometry).
     */
    _setupMeshAndCamera() {
        let loadingEl = document.getElementById('snap-editor-loading');

        // --- Hàm callback chung sau khi mesh đã sẵn sàng ---
        const onMeshReady = (rootMesh) => {
            this.editorMesh = rootMesh;
            if (!this.editorMesh) {
                console.error('[SnapEditor] editorMesh is null after load');
                if (loadingEl) loadingEl.style.display = 'none';
                return;
            }

            // Reset transform
            this.editorMesh.position = BABYLON.Vector3.Zero();
            this.editorMesh.rotationQuaternion = null;
            this.editorMesh.rotation = BABYLON.Vector3.Zero();

            // GLB models: match World Builder / Robot Configurator orientation.
            // When BabylonJS loads a GLB, the __root__ node gets a rotationQuaternion
            // for glTF→BabylonJS coordinate conversion. World Builder clears it and
            // negates scaling.z to get the correct visual orientation. We must do the
            // same here so the editor model matches the scene model exactly.
            if (this.modelURL) {
                this.editorMesh.scaling = new BABYLON.Vector3(1, 1, -1);
            } else {
                this.editorMesh.scaling = new BABYLON.Vector3(1, 1, 1);
            }

            // Xóa rác markers/preview nếu có
            this.editorMesh.getChildMeshes(false).forEach(m => {
                if (m.name.includes("preview") || m.name.includes("marker") || m.name.includes("snappoint")) {
                    m.dispose();
                }
            });

            // Áp dụng material phẳng để hiển thị rõ
            this._applyEditorMaterial();

            // Tính bounding box và fit camera
            this._fitCameraToEditorMesh();

            // Ẩn loading
            if (loadingEl) loadingEl.style.display = 'none';

            // Auto-generate snap points from model bounding box if none defined
            // (e.g., body with GLB model where box fallback was skipped)
            if (this.snapPoints.length === 0 && this.editorMesh) {
                this._autoFromBBox();
            }

            // Render markers
            this._refreshPointList();
            this._refreshMarkers();
        };

        if (this.modelURL) {
            // --- GLB / GLTF / STL: Load từ URL ---
            this._loadModelFromURL(this.modelURL, onMeshReady, loadingEl);
        } else {
            // --- Primitive mesh (Box, Cylinder, Sphere...) hoặc mesh không có URL ---
            this._clonePrimitiveMesh(onMeshReady, loadingEl);
        }
    }

    /**
     * Load model từ URL (GLB/GLTF/STL) vào scene editor độc lập.
     */
    _loadModelFromURL(url, onReady, loadingEl) {
        // Tách root path và file name
        let lastSlash = url.lastIndexOf('/');
        let rootPath = lastSlash >= 0 ? url.substring(0, lastSlash + 1) : '';
        let fileName = lastSlash >= 0 ? url.substring(lastSlash + 1) : url;

        // Nếu là data URL hoặc blob URL, Babylon xử lý trực tiếp
        let isDataUrl = url.startsWith('data:') || url.startsWith('blob:');
        if (isDataUrl) {
            rootPath = '';
            fileName = url;
        }

        BABYLON.SceneLoader.ImportMesh("", rootPath, fileName, this.scene, (newMeshes, particleSystems, skeletons, animationGroups) => {
            if (!newMeshes || newMeshes.length === 0) {
                console.error('[SnapEditor] No meshes loaded from URL:', url);
                if (loadingEl) loadingEl.innerText = '⚠ Không thể tải model';
                return;
            }

            // Dừng animation nếu có
            if (animationGroups) {
                animationGroups.forEach(ag => ag.stop());
            }

            // Tìm root: prefer __root__ (GLB standard), else mesh without parent
            let __root__ = newMeshes.find(m => m.name === '__root__');
            let root;

            if (__root__) {
                // GLB files: __root__ is the container. Use it directly.
                root = __root__;
            } else {
                // Non-GLB: find meshes without parent
                let rootMeshes = newMeshes.filter(m => !m.parent);
                root = rootMeshes.length > 0 ? rootMeshes[0] : newMeshes[0];

                if (rootMeshes.length > 1) {
                    let container = new BABYLON.Mesh("editorRoot", this.scene);
                    rootMeshes.forEach(m => { m.parent = container; });
                    root = container;
                }
            }

            onReady(root);
        }, null, (scene, message, exception) => {
            console.error('[SnapEditor] Load error:', message, exception);
            if (loadingEl) loadingEl.innerText = '⚠ Lỗi tải: ' + message;
        });
    }

    /**
     * Clone primitive mesh (không phải GLB) an toàn sang scene editor.
     * Cross-scene clone: extract VertexData từ mỗi mesh và recreate trong editor scene.
     */
    _clonePrimitiveMesh(onReady, loadingEl) {
        let rootClone = new BABYLON.Mesh("editorRoot", this.scene);

        // Recursive: clone mỗi mesh trong hierarchy sang editor scene
        const cloneOneMesh = (srcMesh, parent, isRoot) => {
            let newMesh = new BABYLON.Mesh("editor_" + srcMesh.name, this.scene);
            newMesh.parent = parent;

            // Copy geometry via VertexData (cross-scene safe)
            // Skip geometry for invisible meshes (physics colliders) — keep as empty container
            let srcVisible = (srcMesh.visibility !== 0 && srcMesh.visibility !== false);
            let totalVerts = 0;
            try { totalVerts = srcMesh.getTotalVertices(); } catch (e) { }

            if (totalVerts > 0 && srcVisible) {
                try {
                    let vd = BABYLON.VertexData.ExtractFromMesh(srcMesh);
                    vd.applyToMesh(newMesh);
                } catch (e) {
                    console.warn('[SnapEditor] Cannot extract vertex data from:', srcMesh.name, e);
                }
            }

            // Copy local transform
            if (isRoot) {
                // Root mesh: reset position to origin (original has world offset from robot)
                newMesh.position = BABYLON.Vector3.Zero();
            } else {
                newMesh.position = srcMesh.position.clone();
            }
            if (srcMesh.rotationQuaternion) {
                newMesh.rotationQuaternion = srcMesh.rotationQuaternion.clone();
            } else {
                newMesh.rotation = srcMesh.rotation.clone();
            }
            newMesh.scaling = srcMesh.scaling.clone();

            // Force visible and pickable (source meshes may be invisible colliders / non-pickable)
            newMesh.visibility = 1;
            newMesh.isVisible = true;
            newMesh.isPickable = true;

            // Recreate material in editor scene (only for visible source meshes)
            if (srcMesh.material && srcVisible) {
                try {
                    let origMat = srcMesh.material;
                    let mat = new BABYLON.StandardMaterial("editorMat_" + srcMesh.name, this.scene);
                    if (origMat.diffuseColor) mat.diffuseColor = origMat.diffuseColor.clone();
                    if (origMat.emissiveColor) mat.emissiveColor = origMat.emissiveColor.clone();
                    if (origMat.specularColor) mat.specularColor = origMat.specularColor.clone();
                    if (origMat.ambientColor) mat.ambientColor = origMat.ambientColor.clone();
                    mat.alpha = origMat.alpha !== undefined ? origMat.alpha : 1;
                    mat.backFaceCulling = false;

                    // Clone diffuse texture if present
                    if (origMat.diffuseTexture && origMat.diffuseTexture.url) {
                        try {
                            let tex = new BABYLON.Texture(origMat.diffuseTexture.url, this.scene);
                            if (origMat.diffuseTexture.uScale) tex.uScale = origMat.diffuseTexture.uScale;
                            if (origMat.diffuseTexture.vScale) tex.vScale = origMat.diffuseTexture.vScale;
                            mat.diffuseTexture = tex;
                        } catch (texErr) {
                            console.warn('[SnapEditor] Cannot clone texture:', texErr);
                        }
                    }

                    newMesh.material = mat;
                } catch (e) {
                    console.warn('[SnapEditor] Cannot clone material for:', srcMesh.name, e);
                }
            }

            // Clone direct children recursively
            srcMesh.getChildMeshes(true).forEach(child => {
                cloneOneMesh(child, newMesh, false);
            });

            return newMesh;
        };

        cloneOneMesh(this.originalMesh, rootClone, true);

        if (loadingEl) loadingEl.style.display = 'none';
        onReady(rootClone);
    }

    /**
     * Áp dụng material cho editor mesh.
     * GLB models: giữ nguyên material gốc (chỉ tắt backface culling).
     * Cloned primitives: giữ nguyên material đã clone.
     * Fallback: áp dụng material phẳng nếu mesh chưa có material.
     */
    _applyEditorMaterial() {
        const applyFallback = (m) => {
            if ((m.geometry || (m.getTotalVertices && m.getTotalVertices() > 0)) && !m.material) {
                let editMat = new BABYLON.StandardMaterial("snapEditorMat_" + m.name, this.scene);
                editMat.diffuseColor = new BABYLON.Color3(0.55, 0.65, 0.75);
                editMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.2);
                editMat.backFaceCulling = false;
                m.material = editMat;
            }
            if (m.material) {
                m.material.backFaceCulling = false;
            }
        };

        applyFallback(this.editorMesh);
        this.editorMesh.getChildMeshes(false).forEach(applyFallback);
    }

    /**
     * Tính bounding box và fit camera vào model.
     */
    _fitCameraToEditorMesh() {
        if (!this.editorMesh) return;

        this.editorMesh.computeWorldMatrix(true);

        let bounds;
        try {
            bounds = this.editorMesh.getHierarchyBoundingVectors(true);
        } catch (e) {
            // Fallback: dùng bounding box của editorMesh
            let bi = this.editorMesh.getBoundingInfo();
            bounds = { min: bi.boundingBox.minimumWorld, max: bi.boundingBox.maximumWorld };
        }

        let sizeVec = bounds.max.subtract(bounds.min);
        let maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        if (maxDim < 0.001) maxDim = 1;

        this._modelSize = maxDim; // Lưu để scale marker

        let center = bounds.max.add(bounds.min).scale(0.5);
        this.editorMesh.position.subtractInPlace(center); // Đưa về gốc tọa độ

        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.radius = maxDim * 2.2;
        this.camera.lowerRadiusLimit = maxDim * 0.1;
        this.camera.upperRadiusLimit = maxDim * 10;
    }

    /**
     * Kiểm tra xem pickedMesh có thuộc về editorMesh hierarchy không.
     * BUG FIX 3: Handle GLB child meshes.
     */
    _isEditorMesh(pickedMesh) {
        if (!pickedMesh || !this.editorMesh) return false;
        let m = pickedMesh;
        while (m) {
            if (m === this.editorMesh) return true;
            m = m.parent;
        }
        return false;
    }

    /**
     * Update preview marker position to follow cursor on mesh surface.
     * Shows a glowing green sphere + normal arrow at the pick point.
     */
    _updatePreviewMarker(pickResult) {
        if (!this.scene) return;

        let worldPoint = pickResult.pickedPoint;
        let worldNormal = pickResult.getNormal(true, true) || new BABYLON.Vector3(0, 1, 0);

        // Lazy-create preview meshes
        if (!this._previewMarker) {
            let markerSize = this._modelSize * 0.05;
            if (markerSize < 0.003) markerSize = 0.003;
            if (markerSize > 0.3) markerSize = 0.3;

            // Sphere marker
            this._previewMarker = BABYLON.MeshBuilder.CreateSphere("previewMarker", {
                diameter: markerSize * 2
            }, this.scene);
            let mat = new BABYLON.StandardMaterial("previewMarkerMat", this.scene);
            mat.emissiveColor = new BABYLON.Color3(0.2, 1, 0.4);
            mat.alpha = 0.6;
            mat.disableLighting = true;
            this._previewMarker.material = mat;
            this._previewMarker.isPickable = false;
            this._previewMarker.renderingGroupId = 1;

            // Normal arrow
            let normalLen = markerSize * 4;
            this._previewNormal = BABYLON.MeshBuilder.CreateCylinder("previewNormal", {
                height: normalLen,
                diameterTop: 0,
                diameterBottom: markerSize * 0.5
            }, this.scene);
            let nMat = new BABYLON.StandardMaterial("previewNormalMat", this.scene);
            nMat.emissiveColor = new BABYLON.Color3(0.2, 1, 0.4);
            nMat.alpha = 0.5;
            nMat.disableLighting = true;
            this._previewNormal.material = nMat;
            this._previewNormal.isPickable = false;
            this._previewNormal.renderingGroupId = 1;
        }

        // Update sphere position
        this._previewMarker.isVisible = true;
        this._previewMarker.position = worldPoint.clone();

        // Update normal arrow position and orientation
        if (this._previewNormal) {
            let normalLen = this._modelSize * 0.2;
            if (normalLen < 0.01) normalLen = 0.01;
            if (normalLen > 1) normalLen = 1;
            this._previewNormal.isVisible = true;
            this._previewNormal.position = worldPoint.add(worldNormal.scale(normalLen / 2));

            // Orient arrow from default Y-up toward worldNormal
            let axisY = new BABYLON.Vector3(0, 1, 0);
            let dot = BABYLON.Vector3.Dot(axisY, worldNormal);
            if (Math.abs(dot) < 0.9999) {
                let cross = BABYLON.Vector3.Cross(axisY, worldNormal);
                let angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                this._previewNormal.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross.normalize(), angle);
            } else if (dot < 0) {
                this._previewNormal.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
            } else {
                this._previewNormal.rotationQuaternion = BABYLON.Quaternion.Identity();
            }
        }
    }

    /**
     * Hide the preview marker when cursor is not over editor mesh.
     */
    _hidePreviewMarker() {
        if (this._previewMarker) this._previewMarker.isVisible = false;
        if (this._previewNormal) this._previewNormal.isVisible = false;
    }

    _addPointFromPick(pickInfo) {
        let worldPoint = pickInfo.pickedPoint;
        let worldNormal = pickInfo.getNormal(true, true) || new BABYLON.Vector3(0, 1, 0);

        // Chuyển về local space của editorMesh
        let invMatrix = this.editorMesh.getWorldMatrix().clone().invert();
        let localPoint = BABYLON.Vector3.TransformCoordinates(worldPoint, invMatrix);
        let localNormal = BABYLON.Vector3.TransformNormal(worldNormal, invMatrix).normalize();

        // Chuyển sang Descartes System: Descartes X=BJS X, Descartes Y=BJS Z, Descartes Z=BJS Y
        let ptPos = [localPoint.x, localPoint.z, localPoint.y];
        let ptNorm = [localNormal.x, localNormal.z, localNormal.y];

        let newName = "point_" + (this.snapPoints.length + 1);
        let newPt = {
            name: newName,
            role: "surface",
            position: ptPos,
            normal: ptNorm
        };

        this.snapPoints.push(newPt);
        this.selectedPointIndex = this.snapPoints.length - 1;

        this._refreshPointList();
        this._refreshMarkers();
        this._populatePropsForm();
    }

    /**
     * BUG FIX 2: Rewrite _autoFromBBox với tọa độ Descartes đúng.
     *
     * Hệ quy chiếu:
     * - BabylonJS: X=phải, Y=lên, Z=trước
     * - Descartes (dự án): X=phải, Y=trước, Z=lên (Y↔Z swap)
     *
     * Lưu snap point trong Descartes: position=[X_d, Y_d, Z_d], normal=[Xn_d, Yn_d, Zn_d]
     * Từ BabylonJS local coords: X_d=BJS_X, Y_d=BJS_Z, Z_d=BJS_Y
     */
    _autoFromBBox() {
        if (!this.editorMesh) {
            alert('Model chưa tải xong, vui lòng thử lại sau.');
            return;
        }

        // Lấy bounding box từ editorMesh (đã được fit vào editor scene)
        this.editorMesh.computeWorldMatrix(true);
        let bounds;
        try {
            bounds = this.editorMesh.getHierarchyBoundingVectors(true);
        } catch (e) {
            let bi = this.editorMesh.getBoundingInfo();
            bounds = { min: bi.boundingBox.minimumWorld, max: bi.boundingBox.maximumWorld };
        }

        // Transform world bounds → local space của editorMesh
        let invMatrix = this.editorMesh.getWorldMatrix().clone().invert();
        let corners = [
            new BABYLON.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
            new BABYLON.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
            new BABYLON.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
            new BABYLON.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
            new BABYLON.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
            new BABYLON.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
            new BABYLON.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
            new BABYLON.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
        ];

        let localMin = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let localMax = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

        corners.forEach(c => {
            let localC = BABYLON.Vector3.TransformCoordinates(c, invMatrix);
            localMin.minimizeInPlace(localC);
            localMax.maximizeInPlace(localC);
        });

        // BabylonJS local: X=left/right, Y=up/down, Z=front/back
        // Descartes: X_d = BJS_X, Y_d = BJS_Z (front/back), Z_d = BJS_Y (up/down)

        // Tâm trong BJS local
        let cx_bjs = (localMin.x + localMax.x) / 2;
        let cy_bjs = (localMin.y + localMax.y) / 2;
        let cz_bjs = (localMin.z + localMax.z) / 2;

        // Tâm trong Descartes
        let cx_d = cx_bjs;
        let cy_d = cz_bjs; // Descartes Y = BJS Z
        let cz_d = cy_bjs; // Descartes Z = BJS Y

        // Round helper
        const r = (v) => Math.round(v * 10000) / 10000;

        // 6 faces trong Descartes coords:
        let autoPoints = [
            {
                name: "top",
                pos: [r(cx_d), r(cy_d), r(localMax.y)],  // Descartes Z+ = BJS Y+
                norm: [0, 0, 1]
            },
            {
                name: "bottom",
                pos: [r(cx_d), r(cy_d), r(localMin.y)],  // Descartes Z- = BJS Y-
                norm: [0, 0, -1]
            },
            {
                name: "front",
                pos: [r(cx_d), r(localMax.z), r(cz_d)],  // Descartes Y+ = BJS Z+ = forward
                norm: [0, 1, 0]
            },
            {
                name: "back",
                pos: [r(cx_d), r(localMin.z), r(cz_d)],  // Descartes Y- = BJS Z- = backward
                norm: [0, -1, 0]
            },
            {
                name: "left",
                pos: [r(localMin.x), r(cy_d), r(cz_d)],  // Descartes X- = BJS X-
                norm: [-1, 0, 0]
            },
            {
                name: "right",
                pos: [r(localMax.x), r(cy_d), r(cz_d)],  // Descartes X+ = BJS X+
                norm: [1, 0, 0]
            }
        ];

        autoPoints.forEach(p => {
            this.snapPoints.push({
                name: p.name,
                role: "surface",
                position: p.pos,
                normal: p.norm
            });
        });

        this.selectedPointIndex = this.snapPoints.length - 1;
        this._refreshPointList();
        this._refreshMarkers();
        this._populatePropsForm();
    }

    _refreshPointList() {
        this.ui.list.innerHTML = '';
        if (this.snapPoints.length === 0) {
            this.ui.list.innerHTML = '<div class="snap-editor-empty-state">Chưa có snap point nào.<br>Double-click lên surface hoặc dùng Auto BBox.</div>';
            this.ui.propsPanel.style.display = 'none';
            return;
        }

        this.snapPoints.forEach((pt, idx) => {
            let div = document.createElement('div');
            div.className = 'snap-editor-list-item' + (idx === this.selectedPointIndex ? ' selected' : '');

            let icon = 'fa-circle';
            if (pt.role === 'attach') icon = 'fa-plug';
            if (pt.role === 'mount') icon = 'fa-thumbtack';
            if (pt.role === 'axle') icon = 'fa-sync';

            div.innerHTML = `<span><i class="fas ${icon}" style="margin-right:8px; color:#888;"></i>${pt.name || '(unnamed)'}</span> <small style="color:#666">${pt.role}</small>`;
            div.onclick = () => this._selectPoint(idx);
            this.ui.list.appendChild(div);
        });

        if (this.selectedPointIndex >= 0 && this.selectedPointIndex < this.snapPoints.length) {
            this.ui.propsPanel.style.display = 'block';
            this._populatePropsForm();
        } else {
            this.ui.propsPanel.style.display = 'none';
        }
    }

    _selectPoint(idx) {
        this.selectedPointIndex = idx;
        this._refreshPointList();
        this._highlightMarker(idx);
    }

    _deleteSelectedPoint() {
        if (this.selectedPointIndex === -1) return;
        this.snapPoints.splice(this.selectedPointIndex, 1);
        this.selectedPointIndex = Math.min(this.selectedPointIndex, this.snapPoints.length - 1);
        this._refreshPointList();
        this._refreshMarkers();
    }

    _populatePropsForm() {
        if (this.selectedPointIndex === -1 || this.selectedPointIndex >= this.snapPoints.length) return;
        let pt = this.snapPoints[this.selectedPointIndex];

        this.ui.inpName.value = pt.name || '';
        this.ui.inpRole.value = pt.role || 'surface';
        // Update role note directly — do NOT dispatch 'change' event to avoid
        // infinite loop: _populatePropsForm → onChange → _updateSelectedPointProp → _refreshPointList → _populatePropsForm
        const roleNotes = {
            'surface': 'Bề mặt phẳng của vật rắn (vd: lưng box). Có thể snap với surface hoặc attach.',
            'attach': 'Điểm có tính chất bám vào bề mặt khối khác (vd: đáy cảm biến). Ưu tiên bám vào surface/mount.',
            'mount': 'Điểm ngàm, trục nhô ra để linh kiện khác gắn vào. Nhận attach.',
            'axle': 'Trục xoay. Chỉ snap với axle khác (vd: tâm bánh xe cắm vào trục motor).'
        };
        this.ui.roleNote.innerText = roleNotes[pt.role] || '';

        let pos = pt.position || [0, 0, 0];
        let norm = pt.normal || [0, 0, 0];

        this.ui.inpPx.value = parseFloat((pos[0] || 0).toFixed(4));
        this.ui.inpPy.value = parseFloat((pos[1] || 0).toFixed(4));
        this.ui.inpPz.value = parseFloat((pos[2] || 0).toFixed(4));

        this.ui.inpNx.value = parseFloat((norm[0] || 0).toFixed(4));
        this.ui.inpNy.value = parseFloat((norm[1] || 0).toFixed(4));
        this.ui.inpNz.value = parseFloat((norm[2] || 0).toFixed(4));
    }

    /**
     * BUG FIX 4: Auto-scale marker sphere theo model size.
     * BUG FIX (cylinder): Cylinder không dùng sphere làm parent để tránh lỗi scale.
     */
    _refreshMarkers() {
        // Dispose old markers
        this.pointMarkers.forEach(group => {
            if (group.sphere) group.sphere.dispose();
            if (group.cyl) group.cyl.dispose();
        });
        this.pointMarkers = [];

        if (!this.editorMesh || !this.scene) return;

        let markerSize = this._modelSize * 0.06;
        if (markerSize < 0.005) markerSize = 0.005;
        if (markerSize > 0.5) markerSize = 0.5;

        let normalLen = markerSize * 3;

        // Materials (reuse per session)
        let yellowMat = this.scene.getMaterialByName("snapYellow") || (() => {
            let m = new BABYLON.StandardMaterial("snapYellow", this.scene);
            m.emissiveColor = new BABYLON.Color3(1, 0.9, 0.1);
            m.disableLighting = true;
            return m;
        })();

        let redMat = this.scene.getMaterialByName("snapRed") || (() => {
            let m = new BABYLON.StandardMaterial("snapRed", this.scene);
            m.emissiveColor = new BABYLON.Color3(1, 0.2, 0.2);
            m.disableLighting = true;
            return m;
        })();

        let normalMat = this.scene.getMaterialByName("snapNormal") || (() => {
            let m = new BABYLON.StandardMaterial("snapNormal", this.scene);
            m.emissiveColor = new BABYLON.Color3(0.3, 0.8, 1);
            m.disableLighting = true;
            return m;
        })();

        let editorWorldMatrix = this.editorMesh.getWorldMatrix();

        this.snapPoints.forEach((pt, idx) => {
            let pos = pt.position || [0, 0, 0];
            let norm = pt.normal || [0, 1, 0];

            // Descartes → BabylonJS: X_bjs=X_d, Y_bjs=Z_d, Z_bjs=Y_d
            let localPos = new BABYLON.Vector3(pos[0], pos[2], pos[1]);
            let localNorm = new BABYLON.Vector3(norm[0], norm[2], norm[1]).normalize();

            // Transform local → world của editorMesh
            let worldPos = BABYLON.Vector3.TransformCoordinates(localPos, editorWorldMatrix);
            let worldNorm = BABYLON.Vector3.TransformNormal(localNorm, editorWorldMatrix.getRotationMatrix()).normalize();

            // Sphere marker
            let sphere = BABYLON.MeshBuilder.CreateSphere("snapSphere_" + idx, {
                diameter: markerSize * 2
            }, this.scene);
            sphere.position = worldPos.clone();
            sphere.material = (idx === this.selectedPointIndex) ? redMat : yellowMat;
            sphere.isMarker = true;
            sphere.pointIndex = idx;
            sphere.isPickable = true;

            // Normal arrow (cylinder) - KHÔNG làm con của sphere để tránh scale lỗi
            let cyl = BABYLON.MeshBuilder.CreateCylinder("snapNorm_" + idx, {
                height: normalLen,
                diameterTop: 0,
                diameterBottom: markerSize * 0.6
            }, this.scene);
            cyl.material = normalMat;
            cyl.isPickable = false;
            cyl.isMarker = false;

            // Đặt cylinder tại worldPos + normalLen/2 theo hướng normal
            cyl.position = worldPos.add(worldNorm.scale(normalLen / 2));

            // Hướng cylinder: mặc định Y+, cần xoay về worldNorm
            let axisY = new BABYLON.Vector3(0, 1, 0);
            let dot = BABYLON.Vector3.Dot(axisY, worldNorm);
            if (Math.abs(dot) < 0.9999) {
                let cross = BABYLON.Vector3.Cross(axisY, worldNorm);
                let angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                cyl.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross.normalize(), angle);
            } else if (dot < 0) {
                cyl.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
            } else {
                cyl.rotationQuaternion = BABYLON.Quaternion.Identity();
            }

            this.pointMarkers.push({ sphere, cyl, idx });
        });
    }

    _highlightMarker(idx) {
        if (!this.scene) return;

        let yellowMat = this.scene.getMaterialByName("snapYellow");
        let redMat = this.scene.getMaterialByName("snapRed");

        this.pointMarkers.forEach((group, i) => {
            if (group.sphere) {
                group.sphere.material = (group.idx === idx) ? redMat : yellowMat;
            }
        });
    }

    _updateMarkerTransform(idx) {
        if (idx < 0 || idx >= this.pointMarkers.length) return;
        if (!this.editorMesh) return;

        let pt = this.snapPoints[idx];
        let group = this.pointMarkers[idx];
        if (!group || !group.sphere) return;

        let pos = pt.position || [0, 0, 0];
        let norm = pt.normal || [0, 1, 0];

        let localPos = new BABYLON.Vector3(pos[0], pos[2], pos[1]);
        let localNorm = new BABYLON.Vector3(norm[0], norm[2], norm[1]).normalize();

        let editorWorldMatrix = this.editorMesh.getWorldMatrix();
        let worldPos = BABYLON.Vector3.TransformCoordinates(localPos, editorWorldMatrix);
        let worldNorm = BABYLON.Vector3.TransformNormal(localNorm, editorWorldMatrix.getRotationMatrix()).normalize();

        let normalLen = this._modelSize * 0.18;

        group.sphere.position = worldPos.clone();

        if (group.cyl) {
            group.cyl.position = worldPos.add(worldNorm.scale(normalLen / 2));
            let axisY = new BABYLON.Vector3(0, 1, 0);
            let dot = BABYLON.Vector3.Dot(axisY, worldNorm);
            if (Math.abs(dot) < 0.9999) {
                let cross = BABYLON.Vector3.Cross(axisY, worldNorm);
                let angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                group.cyl.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross.normalize(), angle);
            } else if (dot < 0) {
                group.cyl.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
            } else {
                group.cyl.rotationQuaternion = BABYLON.Quaternion.Identity();
            }
        }
    }

    _saveAndApply() {
        // Convert editor format (position) to DB format (localPos)
        let dbFormatPoints = this.snapPoints.map(p => ({
            name: p.name,
            localPos: [...(p.position || p.localPos || [0, 0, 0])],
            normal: [...(p.normal || [0, 0, 1])],
            role: p.role || 'surface'
        }));

        if (this.isBuiltIn && this.modelURL) {
            // Built-in model (by URL): Save to LocalStorage + update runtime DB
            const localKey = 'snap_custom_' + this.modelURL;
            localStorage.setItem(localKey, JSON.stringify(dbFormatPoints));

            if (typeof SNAP_POINTS_DB !== 'undefined') {
                if (!SNAP_POINTS_DB[this.modelURL]) SNAP_POINTS_DB[this.modelURL] = {};
                SNAP_POINTS_DB[this.modelURL].snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
            }
            alert('Đã lưu cấu hình Snap Point vào Local Storage.');
        } else if (this.componentType === '__body__') {
            // Robot body: save to componentData.options.bodySnapPoints
            // Editor works at native model scale; configurator uses bodyModelScale
            let scale = (this.componentData?.options?.bodyModelScale) || 1;
            let scaledPoints = dbFormatPoints.map(p => {
                let lp = p.localPos || [0, 0, 0];
                return {
                    name: p.name,
                    localPos: [lp[0] * scale, lp[1] * scale, lp[2] * scale],
                    normal: p.normal,
                    role: p.role
                };
            });
            if (this.componentData) {
                if (!this.componentData.options) this.componentData.options = {};
                this.componentData.options.bodySnapPoints = JSON.parse(JSON.stringify(scaledPoints));
            }
            // Update runtime DB: override dynamic with static scaled points
            if (typeof SNAP_POINTS_DB !== 'undefined') {
                SNAP_POINTS_DB['__body__'].snapPoints = JSON.parse(JSON.stringify(scaledPoints));
                SNAP_POINTS_DB['__body__']._savedDynamic = SNAP_POINTS_DB['__body__'].dynamic;
                SNAP_POINTS_DB['__body__'].dynamic = false;
            }
            alert('Đã áp dụng Snap Points cho Body.');
        } else if (this.isBuiltInComponent && this.componentType) {
            // Built-in component type (UltrasonicSensor, etc.): Update runtime DB
            if (typeof SNAP_POINTS_DB !== 'undefined') {
                SNAP_POINTS_DB[this.componentType] = {
                    snapPoints: JSON.parse(JSON.stringify(dbFormatPoints))
                };
            }
            // Also save to componentData options for persistence
            if (this.componentData) {
                if (!this.componentData.options) this.componentData.options = {};
                this.componentData.options.snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
            }
            alert('Đã cập nhật Snap Points cho ' + this.componentType + '.\nDùng "Copy code for DB" để lưu vĩnh viễn vào snapPointsDB.js.');
        } else {
            // User-imported / custom objects: save into componentData
            if (this.componentData) {
                if (!this.componentData.options) this.componentData.options = {};
                this.componentData.options.snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
            }
            alert('Đã áp dụng Snap Points cho Object này.');
        }
        // Notify caller and dispatch global event BEFORE close()
        if (this._onSaveCallback) {
            try { this._onSaveCallback(); } catch (e) { console.warn('[SnapEditor] onSave callback error:', e); }
        }
        window.dispatchEvent(new CustomEvent('snapPointsUpdated'));
        this.close();
    }

    /**
     * Copy snap points as code snippet in the exact format of snapPointsDB.js.
     * Uses `localPos` (not `position`) to match the DB convention.
     */
    _copyToClipboard() {
        // Convert to DB format
        let dbPoints = this.snapPoints.map(p => ({
            name: p.name,
            localPos: (p.position || p.localPos || [0, 0, 0]).map(v => Math.round(v * 1000) / 1000),
            normal: (p.normal || [0, 0, 1]).map(v => Math.round(v * 1000) / 1000),
            role: p.role || 'surface'
        }));

        // Generate readable code
        let lines = dbPoints.map(p => {
            return '            { ' +
                "name: '" + p.name + "', " +
                'localPos: [' + p.localPos.join(', ') + '], ' +
                'normal: [' + p.normal.join(', ') + '], ' +
                "role: '" + p.role + "'" +
                ' }';
        });

        let key = this.componentType || this.modelURL || 'MyComponent';
        let snippet =
            "    // " + key + "\n" +
            "    '" + key + "': {\n" +
            "        snapPoints: [\n" +
            lines.join(',\n') + '\n' +
            "        ]\n" +
            "    }";

        navigator.clipboard.writeText(snippet).then(() => {
            alert('Đã copy code vào Clipboard!\nDán vào SNAP_POINTS_DB trong file:\npublic/js/common/snapPointsDB.js');
        }).catch(err => {
            // Fallback
            let ta = document.createElement('textarea');
            ta.value = snippet;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            alert('Đã copy (fallback).');
        });
    }
}

window.SnapPointEditor = new SnapPointEditorClass();
