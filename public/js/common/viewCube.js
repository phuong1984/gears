/**
 * ViewCube — CSS 3D orientation cube synced with BabylonJS camera
 * Click faces to switch camera preset views
 * Includes Descartes XYZ axes at the left-front-bottom vertex
 */
var viewCube = new function () {
    var self = this;
    this.cubeEl = null;
    this.containerEl = null;
    this.axesEl = null;

    /**
     * Initialize view cube inside a parent element
     * @param {HTMLElement|string} parent - container element or CSS selector
     */
    this.init = function (parent) {
        var parentEl = typeof parent === 'string' ? document.querySelector(parent) : parent;
        if (!parentEl) return;

        self.containerEl = document.createElement('div');
        self.containerEl.className = 'viewCube-container';

        // Wrapper that receives the 3D rotation (cube + axes rotate together)
        self.cubeEl = document.createElement('div');
        self.cubeEl.className = 'viewCube';

        var faces = [
            { cls: 'front', preset: 'front', label: 'Front' },
            { cls: 'back', preset: 'back', label: 'Back' },
            { cls: 'left', preset: 'left', label: 'Left' },
            { cls: 'right', preset: 'right', label: 'Right' },
            { cls: 'top', preset: 'top', label: 'Top' },
            { cls: 'bottom', preset: 'bottom', label: 'Btm' }
        ];

        faces.forEach(function (f) {
            var face = document.createElement('div');
            face.className = 'viewCube-face ' + f.cls;
            face.textContent = f.label;
            face.dataset.preset = f.preset;
            face.addEventListener('click', function () {
                if (typeof cameraUtils !== 'undefined') {
                    cameraUtils.setCameraPreset(f.preset);
                }
            });
            self.cubeEl.appendChild(face);
        });

        // Create XYZ axes at the left-front-bottom corner of the cube
        // CSS left:0 + bottom:0 = 2D bottom-left corner (0, 60)
        // translate3d Z=+30px pushes to front face = left-front-bottom vertex
        self.axesEl = document.createElement('div');
        self.axesEl.className = 'viewCube-axes';
        self.axesEl.style.transform = 'translate3d(0px, 0px, 30px)';

        var axes = [
            { cls: 'axis-x', label: 'X' },
            { cls: 'axis-y', label: 'Y' },
            { cls: 'axis-z', label: 'Z' }
        ];

        axes.forEach(function (a) {
            var axisDiv = document.createElement('div');
            axisDiv.className = 'viewCube-axis ' + a.cls;

            var line = document.createElement('div');
            line.className = 'viewCube-axis-line';
            axisDiv.appendChild(line);

            var label = document.createElement('div');
            label.className = 'viewCube-axis-label';
            label.textContent = a.label;
            axisDiv.appendChild(label);

            self.axesEl.appendChild(axisDiv);
        });

        self.cubeEl.appendChild(self.axesEl);
        self.containerEl.appendChild(self.cubeEl);
        parentEl.appendChild(self.containerEl);
    };

    /**
     * Update cube rotation to match camera (call in render loop)
     */
    this.update = function () {
        if (!self.cubeEl || !babylon || !babylon.cameraArc) return;
        var alpha = babylon.cameraArc.alpha;
        var beta = babylon.cameraArc.beta;

        var rotX = (beta * 180 / Math.PI) - 90;
        var rotY = -(alpha * 180 / Math.PI + 90);

        self.cubeEl.style.transform =
            'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    };
};
