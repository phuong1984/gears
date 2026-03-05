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
        this._bboxCenterLocal = null; // BBox center in BJS local space
        this._bboxCenterDesc = null; // BBox center in Descartes [X, Y, Z]
        this._rawBBoxCenter = null;
        this._modelSizeNative = 1;

        // Hover preview state
        this._lastPickResult = null;
        this._previewMarker = null;
        this._previewNormal = null;

        this.ui = {};
    }

    /**
     * Get the modelScale for the current component.
     * Editor works at native model scale (1x), but the configurator's body
     * bounding box is sized at modelScale. Snap point positions must be
     * scaled accordingly when saving/loading.
     *
     * Configurator: componentData.options.modelScale
     * World Builder: componentData.modelScale (flat object, no nested options)
     */
    _getModelScale() {
        if (!this.componentData) return 1;
        let opts = this.componentData.options || {};
        // Body uses bodyModelScale
        if (this.componentType === '__body__') {
            return opts.bodyModelScale || 1;
        }
        // Check nested options first (Robot Configurator), then top-level (World Builder)
        return opts.modelScale || this.componentData.modelScale || 1;
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
        // _isSTL is explicitly removed, we map Z-up and Y-up uniformly
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
        if (this._resizeObservable && this.scene) {
            this.scene.onBeforeRenderObservable.remove(this._resizeObservable);
            this._resizeObservable = null;
        }
        if (this._previewMarker) { this._previewMarker.dispose(); this._previewMarker = null; }
        if (this._previewNormal) { this._previewNormal.dispose(); this._previewNormal = null; }
        if (this._previewNode) { this._previewNode.dispose(); this._previewNode = null; }
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
        this._appliedBboxToLoadedPts = false;
        let modelScale = this._getModelScale();
        let isModel = this.modelURL || (this.isBuiltIn && this.componentType !== '__body__');

        const parsePt = (p) => {
            let lp = p.localPos || p.position || [0, 0, 0];
            let unscaled = [...lp];
            let norm = [...(p.normal || [0, 0, 1])];

            // No Z-axis flip needed! 
            // The UI will operate in Unflipped Body Space natively!
            return {
                name: p.name,
                role: p.role || 'surface',
                position: unscaled,
                normal: norm
            };
        };

        // 1. Built-in model: ưu tiên localStorage, sau đó DB gốc (by modelURL)
        if (this.isBuiltIn && this.modelURL) {
            const localKey = 'snap_custom_' + this.modelURL;
            const localData = localStorage.getItem(localKey);
            let rawPts = null;
            if (localData) {
                try { rawPts = JSON.parse(localData); } catch (e) { console.error(e); }
            } else if (typeof SNAP_POINTS_DB !== 'undefined' && SNAP_POINTS_DB[this.modelURL]) {
                const dbData = SNAP_POINTS_DB[this.modelURL].snapPoints;
                if (dbData) rawPts = JSON.parse(JSON.stringify(dbData));
            }
            if (rawPts && rawPts.length > 0) {
                console.log('[SnapEditor] LOAD built-in: scale=' + modelScale + ', rawPts[0].localPos=', rawPts[0].localPos);
                this.snapPoints = rawPts.map(p => parsePt(p));
                console.log('[SnapEditor] LOAD result: snapPoints[0].position=', this.snapPoints[0].position);
                return;
            }
        }

        // 1b. Body: check user-defined bodySnapPoints
        if (this.componentType === '__body__' && this.componentData?.options?.bodySnapPoints) {
            let pts = this.componentData.options.bodySnapPoints;
            if (pts.length > 0) {
                this.snapPoints = pts.map(p => parsePt(p));
                return;
            }
        }

        // 2. Lookup by component type (e.g., 'UltrasonicSensor', 'ColorSensor')
        if (this.componentType && this.componentType !== '__body__' && typeof SNAP_POINTS_DB !== 'undefined' && SNAP_POINTS_DB[this.componentType]) {
            let dbEntry = SNAP_POINTS_DB[this.componentType];
            let pts;
            if (dbEntry.dynamic && typeof dbEntry.getSnapPoints === 'function') {
                pts = dbEntry.getSnapPoints(this.componentData.options || {});
            } else {
                pts = dbEntry.snapPoints;
            }
            if (pts && pts.length > 0) {
                // For component types, if they don't have a modelURL, they might be primitives without scale.
                // But parsePt with scale=1 handles it if modelScale is not used.
                // Actually, let's just use scale=1 if it's from dbEntry! SnapPointsDB usually stores Native scale coords.
                // Wait! Primitives in SnapPointsDB are in native scale (1:1), so scale=1.
                this.snapPoints = pts.map(p => parsePt(p));
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
                    // For dynamic primitives, pass the model options (they generate unscaled points or appropriately scaled based on options)
                    pts = dbEntry.getSnapPoints(this.componentData.options || {});
                } else {
                    pts = dbEntry.snapPoints;
                }
                if (pts && pts.length > 0) {
                    this.snapPoints = pts.map(p => parsePt(p));
                    return;
                }
            }
        }

        // 4. User Imported: load từ componentData
        let savedPts = this.componentData?.options?.snapPoints || this.componentData?.snapPoints;
        if (savedPts && Array.isArray(savedPts) && savedPts.length > 0) {
            this.snapPoints = savedPts.map(p => parsePt(p));
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
            // Prefer _modelFileName for user-uploaded files (data URLs show base64 garbage)
            let fileName = this.componentData?.options?._modelFileName
                || this.componentData?._modelFileName || '';
            if (fileName) {
                displayName = fileName;
            } else if (!this.modelURL.startsWith('data:') && !this.modelURL.startsWith('blob:')) {
                displayName = this.modelURL.split('/').pop() || displayName;
            }
        }
        if (this.componentData?.type) {
            displayName = this.componentData.type + (displayName !== 'Unknown' ? ' (' + displayName + ')' : '');
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
                        <div class="cameraPresets">
                            <div class="cameraPresetBtn" data-preset="front" data-preset-right="back" title="Left Click: Front&#10;Right Click: Back">Front/Back</div>
                            <div class="cameraPresetBtn" data-preset="left" data-preset-right="right" title="Left Click: Left&#10;Right Click: Right">Left/Right</div>
                            <div class="cameraPresetBtn" data-preset="top" data-preset-right="bottom" title="Left Click: Top&#10;Right Click: Bottom">Top/Bottom</div>
                            <div class="cameraPresetBtn" data-preset="default3d" title="Default 3D View (Numpad 5)">3D</div>
                        </div>
                    </div>
                    <div class="snap-editor-sidebar">
                        <div class="snap-editor-sidebar-section">
                            <span class="snap-editor-source-badge ${sourceModeClass}">${sourceModeLabel}</span>
                            <div class="snap-editor-toolbox">
                                <button id="snap-btn-auto-bbox" title="Sinh 6 điểm ở 6 mặt của Bounding Box"><i class="fas fa-box"></i> Auto từ BBox</button>
                                <button id="snap-btn-clear" title="Xóa toàn bộ điểm"><i class="fas fa-trash"></i> Clear All</button>
                            </div>
                            <div class="snap-editor-toolbox" style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 0.8rem; color: #aaa;">Model Scale</label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="range" id="snap-scale-slider" min="0.1" max="10" step="0.1" value="1" style="flex: 1;">
                                    <span id="snap-scale-text" style="min-width: 30px; font-weight: bold;">1.0</span>
                                </div>
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

        // Scale slider
        const scaleSlider = document.getElementById('snap-scale-slider');
        const scaleText = document.getElementById('snap-scale-text');
        if (scaleSlider) {
            scaleSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (scaleText) scaleText.innerText = val.toFixed(1);
                this._updateModelScale(val);
            });
            // Set initial value
            const currentScale = this._getModelScale();
            scaleSlider.value = currentScale;
            if (scaleText) scaleText.innerText = currentScale.toFixed(1);
        }
    }

    _updateModelScale(val) {
        if (!this.editorMesh) return;

        // Update mesh scaling (keep Z flip convention)
        const s = val;
        this.editorMesh.scaling = new BABYLON.Vector3(s, s, -s);

        // Re-center mesh based on stored raw bounding center
        if (this._rawBBoxCenter) {
            this.editorMesh.position.set(
                -this._rawBBoxCenter.x * s,
                -this._rawBBoxCenter.y * s,
                this._rawBBoxCenter.z * s   // Z-flip → sign is opposite for shift
            );
            this.editorMesh.computeWorldMatrix(true);
        }

        // Cache the current max dimension for helper logic (e.g. camera radius, marker scale)
        // If we have maxDim(native), scaled maxDim is native * s
        let currentMaxDim = this._modelSizeNative * s;
        this._modelSize = currentMaxDim;

        // Refresh markers (they depend on scaling for size)
        this._refreshMarkers();

        // Update component data so it's saved/passed back
        if (this.componentData) {
            if (!this.componentData.options) this.componentData.options = {};
            if (this.componentType === '__body__') {
                this.componentData.options.bodyModelScale = s;
                console.log('[SnapEditor] Scale update for Body: bodyModelScale=' + s);
            } else {
                this.componentData.options.modelScale = s;
                console.log('[SnapEditor] Scale update for Component: modelScale=' + s);
            }
        }
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
            if (this.editorViewCube) this.editorViewCube.update();
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

        // Camera preset buttons
        let container = this.container;
        if (container) {
            let presetBtns = container.querySelectorAll('.cameraPresetBtn');
            presetBtns.forEach(btn => {
                btn.addEventListener('mousedown', (e) => {
                    if (e.button === 0) {
                        let preset = btn.dataset.preset;
                        if (preset && typeof cameraUtils !== 'undefined') cameraUtils.setCameraPreset(preset, this.camera, this.scene);
                    } else if (e.button === 2) {
                        let presetRight = btn.dataset.presetRight;
                        if (presetRight && typeof cameraUtils !== 'undefined') cameraUtils.setCameraPreset(presetRight, this.camera, this.scene);
                    }
                });
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                });
            });
        }

        // Create ViewCube axes indicator
        this.editorViewCube = new ViewCubeClass();
        this.editorViewCube.init(this.canvas.parentElement, this.camera, this.scene);

        this._setupScaleObservable();
    }

    _setupScaleObservable() {
        if (this._resizeObservable || !this.scene) return;
        this._resizeObservable = this.scene.onBeforeRenderObservable.add(() => {
            let pScaleX = 1.0;
            if (this.editorMesh && this.editorMesh.absoluteScaling) {
                pScaleX = this.editorMesh.absoluteScaling.x || 1.0;
            }

            let ms = (this._modelSize * pScaleX) * 0.1;
            if (ms < 0.03) ms = 0.03;
            if (ms > 1.2) ms = 1.2;

            this.pointMarkers.forEach(group => {
                if (group.wrapper) {
                    group.wrapper.scaling.set(ms, ms, ms);
                }
            });

            if (this._previewNode) {
                this._previewNode.scaling.set(ms, ms, ms);
            }
        });
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

            // 1. Reset transform to compute raw center/size
            this.editorMesh.position = BABYLON.Vector3.Zero();
            this.editorMesh.rotationQuaternion = null;
            this.editorMesh.rotation = BABYLON.Vector3.Zero();
            this.editorMesh.scaling = BABYLON.Vector3.One();
            this.editorMesh.computeWorldMatrix(true);

            let bounds;
            try {
                // Compute bounds in NATIVE state (unscaled, unrotated)
                bounds = this.editorMesh.getHierarchyBoundingVectors(true);
            } catch (e) {
                let bi = this.editorMesh.getBoundingInfo();
                bounds = { min: bi.boundingBox.minimumWorld.clone(), max: bi.boundingBox.maximumWorld.clone() };
            }
            this._rawBBoxCenter = bounds.max.add(bounds.min).scale(0.5);
            let sizeVec = bounds.max.subtract(bounds.min);
            this._modelSizeNative = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
            if (this._modelSizeNative < 0.001) this._modelSizeNative = 1;

            // 2. Clear old markers before applying scaling
            this.editorMesh.getChildMeshes(false).forEach(m => {
                if (m.name.includes("preview") || m.name.includes("marker") || m.name.includes("snappoint")) {
                    m.dispose();
                }
            });

            this._applyEditorMaterial();

            // 3. Apply Unified Scaling and Centering
            // This sets mesh.scaling = (s, s, -s) and mesh.position = -center*s
            const s = this._getModelScale();
            this._updateModelScale(s);

            // 4. Camera target center (which is now world 0,0,0)
            this.camera.setTarget(BABYLON.Vector3.Zero());
            this.camera.radius = this._modelSize * 2.2;
            this.camera.lowerRadiusLimit = this._modelSize * 0.1;
            this.camera.upperRadiusLimit = this._modelSize * 10;

            // Cache bounding vectors for _autoFromBBox (unflipped original bounds for easy mapping)
            this._unflippedBoundsNative = bounds;

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
        var self = this;

        // Ensure shared ModelLoader is available (dynamically load if needed)
        function ensureModelLoader() {
            if (window.ModelLoader) return Promise.resolve();
            return new Promise(function (resolve, reject) {
                var s = document.createElement('script');
                s.src = 'js/common/modelLoader.js';
                s.onload = function () { resolve(); };
                s.onerror = function (e) { reject(e); };
                document.head.appendChild(s);
            });
        }

        var modelFileName = this.componentData?.options?._modelFileName || this.componentData?._modelFileName || '';
        var modelScale = this.componentData?.options?.modelScale || 1;

        ensureModelLoader().then(function () {
            if (loadingEl) loadingEl.innerText = 'Loading...';
            return window.ModelLoader.loadModel({ scene: self.scene, url: url, fileName: modelFileName, modelScale: modelScale });
        }).then(function (result) {
            if (!result) {
                if (loadingEl) loadingEl.innerText = '⚠ Không thể tải model';
                return;
            }
            if (result.error) {
                console.error('[SnapEditor] Load failed:', result.error);
                if (loadingEl) loadingEl.innerText = '⚠ Không thể tải model';
                return;
            }

            var newMeshes = result.meshes || [];
            if (!newMeshes || newMeshes.length === 0) {
                console.error('[SnapEditor] No meshes loaded from URL:', url);
                if (loadingEl) loadingEl.innerText = '⚠ Không thể tải model';
                return;
            }

            // Stop any animations if present
            if (result.animationGroups) {
                result.animationGroups.forEach(function (ag) { try { ag.stop(); } catch (e) { } });
            }

            var __root__ = newMeshes.find(function (m) { return m.name === '__root__'; });
            var root = __root__ || newMeshes.find(function (m) { return !m.parent; }) || newMeshes[0];

            // Calculate and store bounding center (matching configurator/builder behavior)
            try {
                var boundingCenter = result.boundingInfo && result.boundingInfo.center ? result.boundingInfo.center : BABYLON.Vector3.Zero();
                self.componentData.options = self.componentData.options || {};
                self.componentData.options.modelBoundingCenter = [boundingCenter.x, boundingCenter.z, boundingCenter.y];
                if (!self.componentData.modelBoundingCenter) {
                    self.componentData.modelBoundingCenter = boundingCenter.clone();
                }
            } catch (e) {
                console.warn('[SnapEditor] Failed to store bounding center:', e);
            }

            onReady(root);
        }).catch(function (err) {
            console.error('[SnapEditor] Load error:', err);
            if (loadingEl) loadingEl.innerText = '⚠ Lỗi tải';
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

    _fitCameraToEditorMesh() {
        // Obsolete: We now do this inside onMeshReady to correctly preserve bounds from before the quaternion wipe.
        // Keeping an empty stub for compatibility if called from elsewhere.
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

        if (!this._previewNode) {
            this._previewNode = new BABYLON.TransformNode("previewNode", this.scene);

            this._previewMarker = BABYLON.MeshBuilder.CreateSphere("previewMarker", { diameter: 1.0, segments: 12 }, this.scene);
            this._previewMarker.parent = this._previewNode;
            let mat = new BABYLON.StandardMaterial("previewMarkerMat", this.scene);
            mat.emissiveColor = new BABYLON.Color3(0, 1, 1);
            mat.alpha = 0.5;
            mat.disableLighting = true;
            this._previewMarker.material = mat;
            this._previewMarker.isPickable = false;
            this._previewMarker.renderingGroupId = 1;

            this._previewNormal = BABYLON.MeshBuilder.CreateCylinder("previewNormal", {
                height: 1.5, diameterTop: 0, diameterBottom: 0.2
            }, this.scene);
            this._previewNormal.parent = this._previewNode;
            this._previewNormal.position.y = 0.75;
            let nMat = new BABYLON.StandardMaterial("previewNormalMat", this.scene);
            nMat.emissiveColor = new BABYLON.Color3(0, 1, 1);
            nMat.alpha = 0.5;
            nMat.disableLighting = true;
            this._previewNormal.material = nMat;
            this._previewNormal.isPickable = false;
            this._previewNormal.renderingGroupId = 1;
        }

        // Update sphere position
        this._previewMarker.isVisible = true;
        this._previewNormal.isVisible = true;

        this._previewNode.position = worldPoint.clone();

        let axisY = new BABYLON.Vector3(0, 1, 0);
        // INVERT world normal for correct arrow direction visualization
        // The cylinder arrow points UP by default, so we need to invert it to point
        // in the actual normal direction
        let invertedNormal = worldNormal.scale(-1);
        let dot = BABYLON.Vector3.Dot(axisY, invertedNormal);
        if (Math.abs(dot) < 0.9999) {
            let cross = BABYLON.Vector3.Cross(axisY, invertedNormal);
            let angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            this._previewNode.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross.normalize(), angle);
        } else if (dot < 0) {
            this._previewNode.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
        } else {
            this._previewNode.rotationQuaternion = BABYLON.Quaternion.Identity();
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

        // Convert world pick position to native model coords using inverse world matrix
        // This correctly handles all transforms: scaling (including Z-flip), position, rotation
        this.editorMesh.computeWorldMatrix(true);
        let invMatrix = this.editorMesh.getWorldMatrix().clone();
        invMatrix.invert();
        let nativeBJS = BABYLON.Vector3.TransformCoordinates(worldPoint, invMatrix);

        // Native BJS -> Descartes mapping (No centering offset - store raw native)
        let ptPos = [nativeBJS.x, nativeBJS.z, nativeBJS.y];

        // Normal: Inverse rotation only
        let rotMatrix = new BABYLON.Matrix();
        invMatrix.getRotationMatrixToRef(rotMatrix);
        let localNormal = BABYLON.Vector3.TransformNormal(worldNormal, rotMatrix).normalize();
        let ptNorm = [localNormal.x, localNormal.z, localNormal.y];

        console.log('[SnapEditor] PICK: worldPt=' + worldPoint.toString()
            + ' nativeBJS=' + nativeBJS.toString()
            + ' descPos=' + JSON.stringify(ptPos));

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

    _autoFromBBox() {
        if (!this.editorMesh || !this._unflippedBoundsNative) {
            alert('Model chưa tải xong, vui lòng thử lại sau.');
            return;
        }

        const bounds = this._unflippedBoundsNative;
        const cx = this._rawBBoxCenter.x;
        const cy = this._rawBBoxCenter.y;
        const cz = this._rawBBoxCenter.z;


        const generatePoint = (name, rawBjsX, rawBjsY, rawBjsZ, normal) => {
            // rawBjs coordinates are absolute in the native mesh space.
            // Map BJS to Descartes: [X, Z, Y] (Store raw native)
            let ptPos = [rawBjsX, rawBjsZ, rawBjsY];

            // Map normal: [X, Z, Y]
            let ptNorm = [normal[0], normal[2], normal[1]];

            return {
                name: name,
                role: "surface",
                position: ptPos.map(v => Math.round(v * 10000) / 10000),
                normal: ptNorm.map(v => Math.round(v * 10000) / 10000)
            };
        };

        let autoPoints = [
            generatePoint("top", cx, bounds.max.y, cz, [0, -1, 0]),
            generatePoint("bottom", cx, bounds.min.y, cz, [0, 1, 0]),
            generatePoint("front", cx, cy, bounds.min.z, [0, 0, -1]),
            generatePoint("back", cx, cy, bounds.max.z, [0, 0, 1]),
            generatePoint("left", bounds.min.x, cy, cz, [-1, 0, 0]),
            generatePoint("right", bounds.max.x, cy, cz, [1, 0, 0])
        ];

        autoPoints.forEach(p => {
            this.snapPoints.push(p);
        });

        this.selectedPointIndex = this.snapPoints.length - 1;
        this._refreshPointList();
        this._refreshMarkers();
        this._populatePropsForm();
    }

    _refreshPointList() {
        this.ui.list.innerHTML = '';
        if (this.snapPoints.length === 0) {
            this.ui.list.innerHTML = '<div class="snap-editor-empty-state">Chưa có snap point nào.<br>Double-click lên surface hoặc dùng Auto Bbox.</div>';
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
            if (group.wrapper) group.wrapper.dispose();
        });
        this.pointMarkers = [];

        if (!this.editorMesh || !this.scene) return;

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

        this.snapPoints.forEach((pt, idx) => {
            let wrapper = new BABYLON.TransformNode("snapWrapper_" + idx, this.scene);

            // Sphere marker
            let sphere = BABYLON.MeshBuilder.CreateSphere("snapSphere_" + idx, {
                diameter: 1.0, segments: 12
            }, this.scene);
            sphere.parent = wrapper;
            sphere.material = (idx === this.selectedPointIndex) ? redMat : yellowMat;
            sphere.isMarker = true;
            sphere.pointIndex = idx;
            sphere.isPickable = true;

            let cyl = BABYLON.MeshBuilder.CreateCylinder("snapNorm_" + idx, {
                height: 1.5, diameterTop: 0, diameterBottom: 0.2
            }, this.scene);
            cyl.parent = wrapper;
            cyl.position.y = 0.75;
            cyl.material = normalMat;
            cyl.isPickable = false;
            cyl.isMarker = false;

            this.pointMarkers.push({ wrapper, sphere, cyl, idx });
            this._updateMarkerTransform(idx); // Initial position and rotation
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
        if (!group || !group.wrapper) return;

        let pos = pt.position || [0, 0, 0];
        let norm = pt.normal || [0, 1, 0];

        // Recover native Descartes position
        let nativeDesc = [pos[0], pos[1], pos[2]];

        // Native BJS mapping (BJS Y=Up(Z), BJS Z=Forward(Y))
        let nativeBJS = new BABYLON.Vector3(pos[0], pos[2], pos[1]);

        // Use BabylonJS world matrix to transform native coords to editor world coords
        this.editorMesh.computeWorldMatrix(true);
        let worldPos = BABYLON.Vector3.TransformCoordinates(nativeBJS, this.editorMesh.getWorldMatrix());

        // Normal mapping
        let normBJS = new BABYLON.Vector3(norm[0], norm[2], norm[1]);
        let rotMatrix = new BABYLON.Matrix();
        this.editorMesh.getWorldMatrix().getRotationMatrixToRef(rotMatrix);
        let worldNorm = BABYLON.Vector3.TransformCoordinates(normBJS, rotMatrix).normalize();
        // Cylinder points UP by default, and we need it to point in the normal direction.
        // Rotation logic handles aligning the Y-axis to worldNorm.
        // No inversion needed.

        group.wrapper.position = worldPos.clone();

        let axisY = new BABYLON.Vector3(0, 1, 0);
        let dot = BABYLON.Vector3.Dot(axisY, worldNorm);
        if (Math.abs(dot) < 0.9999) {
            let cross = BABYLON.Vector3.Cross(axisY, worldNorm);
            let angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            group.wrapper.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cross.normalize(), angle);
        } else if (dot < 0) {
            group.wrapper.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
        } else {
            group.wrapper.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
    }

    _saveAndApply() {
        // Convert editor format (position) to DB format (localPos)
        // Editor positions are relative to GLB's local origin.
        // Configurator body is centered at the bounding box center.
        // We must: (1) subtract bbox center offset, (2) scale by modelScale.
        let modelScale = this._getModelScale();
        let bboxOff = this._bboxCenterDesc || [0, 0, 0]; // Descartes [X, Y, Z]

        console.log('%c[SnapEditor] ===== SAVE DEBUG START =====', 'color: red; font-weight: bold');
        console.log('[SnapEditor] SAVE: modelScale=' + modelScale
            + ', bboxOff(Descartes)=' + JSON.stringify(bboxOff)
            + ', bboxCenterLocal(BJS)=' + (this._bboxCenterLocal ? this._bboxCenterLocal.toString() : 'null'));
        console.log('[SnapEditor] SAVE: componentData=', JSON.stringify({
            type: this.componentType,
            modelURL: this.modelURL,
            'options.modelScale': this.componentData?.options?.modelScale,
            'top-level modelScale': this.componentData?.modelScale,
            isBuiltIn: this.isBuiltIn,
            isBuiltInComponent: this.isBuiltInComponent
        }));

        let isModel = this.modelURL || (this.isBuiltIn && this.componentType !== '__body__');

        let dbFormatPoints = this.snapPoints.map(p => {
            let pos = p.position || p.localPos || [0, 0, 0];
            // SAVING PURE V_RAW WITHOUT OFFSETTING
            // In the DB and presets, snap point options represent the raw Descartes
            // coordinate directly overlaid on the 3D model geometry without scaling or offsets.
            // SnapManager mathematically applies scale, offset, and Z-flip at runtime.
            let adjusted = [
                pos[0],
                pos[1],
                pos[2]
            ];

            let norm = [...(p.normal || [0, 0, 1])];

            return {
                name: p.name,
                localPos: adjusted,
                normal: norm,
                role: p.role || 'surface'
            };
        });
        dbFormatPoints.forEach((pt, i) => {
            let srcPos = this.snapPoints[i]?.position;
            console.log('[SnapEditor] SAVE pt[' + i + '] "' + pt.name + '": editorPos(Desc)=' + JSON.stringify(srcPos)
                + ' -> Saved DB localPos=' + JSON.stringify(pt.localPos));
        });
        console.log('%c[SnapEditor] ===== SAVE DEBUG END =====', 'color: red; font-weight: bold');

        if (this.componentData) {
            if (!this.componentData.options) this.componentData.options = {};

            // Save current modelScale
            this.componentData.options.modelScale = this._getModelScale();

            // Save modelBoundingCenter (Descartes [X, Y, Z])
            if (this._rawBBoxCenter) {
                // native BJS (X, Y, Z) -> Descartes (X, Z, Y)
                this.componentData.options.modelBoundingCenter = [
                    this._rawBBoxCenter.x,
                    this._rawBBoxCenter.z,
                    this._rawBBoxCenter.y
                ];
            }
        }

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
            // Body uses bodyModelScale which is separate from modelScale.
            // dbFormatPoints already has modelScale applied (which is bodyModelScale for body).
            if (this.componentData) {
                if (!this.componentData.options) this.componentData.options = {};
                this.componentData.options.bodySnapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
            }
            // Update runtime DB: override dynamic with static scaled points
            if (typeof SNAP_POINTS_DB !== 'undefined') {
                SNAP_POINTS_DB['__body__'].snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
                SNAP_POINTS_DB['__body__']._savedDynamic = SNAP_POINTS_DB['__body__'].dynamic;
                SNAP_POINTS_DB['__body__'].dynamic = false;
            }
            alert('Đã áp dụng Snap Points cho Body.');
        } else if (this.isBuiltInComponent && this.componentType) {
            // Built-in component type (MotorActuator, UltrasonicSensor, etc.): Update runtime DB
            if (typeof SNAP_POINTS_DB !== 'undefined') {
                // Preserve the existing entry (keep dynamic/getSnapPoints if present)
                if (SNAP_POINTS_DB[this.componentType]) {
                    SNAP_POINTS_DB[this.componentType].snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
                } else {
                    SNAP_POINTS_DB[this.componentType] = {
                        snapPoints: JSON.parse(JSON.stringify(dbFormatPoints))
                    };
                }
            }
            // Also save to componentData options for persistence
            if (this.componentData) {
                if (!this.componentData.options) this.componentData.options = {};
                this.componentData.options.snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));

                // If a preset is active, also update the preset registry so the snap points
                // are used when the preset is loaded in future resetScene calls
                let presetName = this.componentData.options.preset;
                if (presetName && presetName !== 'Custom' && typeof window !== 'undefined' && window.MOTOR_PRESETS && window.MOTOR_PRESETS[presetName]) {
                    window.MOTOR_PRESETS[presetName].snapPoints = JSON.parse(JSON.stringify(dbFormatPoints));
                    console.log('[SnapEditor] Updated MOTOR_PRESETS["' + presetName + '"].snapPoints');
                }
            }
            alert('Đã cập nhật Snap Points cho ' + this.componentType + '.\nDùng "Copy code for DB" để lưu vĩnh viễn vào snapPointsDB.js.');
        } else {
            // User-imported / custom objects: save into componentData
            if (this.componentData) {
                let pts = JSON.parse(JSON.stringify(dbFormatPoints));
                // Detect data structure:
                // Robot Configurator: componentData.options = { modelURL, modelScale, ... }
                // World Builder: componentData = { modelURL, modelScale, ... } (flat, no nested options)
                let hasNestedOptions = this.componentData.options
                    && (this.componentData.options.modelURL !== undefined
                        || this.componentData.options.modelScale !== undefined);
                if (hasNestedOptions) {
                    // Configurator path: save into nested options
                    this.componentData.options.snapPoints = pts;
                } else {
                    // World Builder path: save at top level
                    this.componentData.snapPoints = pts;
                }
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
