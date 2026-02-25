/**
 * UndoManager — Shared undo/redo logic for Configurator and Builder
 * 
 * Usage:
 *   var undoMgr = new UndoManager({
 *     getState: function() { return JSON.stringify(data); },
 *     setState: function(stateStr) { data = JSON.parse(stateStr); },
 *     onStateChange: function() { refreshUI(); },
 *     maxHistory: 50
 *   });
 *   
 *   undoMgr.save();     // Save current state (call before any action)
 *   undoMgr.undo();     // Undo last action
 *   undoMgr.redo();     // Redo last undone action
 */
function UndoManager(options) {
    var self = this;

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = options.maxHistory || 50;

    // Callbacks
    this.getState = options.getState;
    this.setState = options.setState;
    this.onStateChange = options.onStateChange || function () { };
    this.onStackChange = options.onStackChange || function () { };

    /**
     * Save current state to undo stack (call BEFORE making changes)
     */
    this.save = function () {
        var state = self.getState();
        self.undoStack.push(state);

        // Trim history if too long
        if (self.undoStack.length > self.maxHistory) {
            self.undoStack.shift();
        }

        // Clear redo stack when a new action is performed
        self.redoStack = [];
        self.onStackChange();
    };

    /**
     * Undo: revert to previous state
     * @returns {boolean} true if undo was performed
     */
    this.undo = function () {
        if (self.undoStack.length === 0) return false;

        // Save current state to redo stack
        var currentState = self.getState();
        self.redoStack.push(currentState);

        // Pop and apply previous state
        var previousState = self.undoStack.pop();
        self.setState(previousState);
        self.onStateChange();
        self.onStackChange();
        return true;
    };

    /**
     * Redo: reapply last undone action
     * @returns {boolean} true if redo was performed
     */
    this.redo = function () {
        if (self.redoStack.length === 0) return false;

        // Save current state to undo stack
        var currentState = self.getState();
        self.undoStack.push(currentState);

        // Pop and apply redo state
        var redoState = self.redoStack.pop();
        self.setState(redoState);
        self.onStateChange();
        self.onStackChange();
        return true;
    };

    /**
     * Clear all history
     */
    this.clear = function () {
        self.undoStack = [];
        self.redoStack = [];
        self.onStackChange();
    };

    /**
     * Check if undo is possible
     */
    this.canUndo = function () {
        return self.undoStack.length > 0;
    };

    /**
     * Check if redo is possible
     */
    this.canRedo = function () {
        return self.redoStack.length > 0;
    };

    /**
     * Setup keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
     * Call this once to enable keyboard shortcuts.
     */
    this.setupKeyboardShortcuts = function () {
        document.addEventListener('keydown', function (e) {
            // Don't trigger when typing in input fields
            var tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                self.undo();
            } else if (
                (e.ctrlKey && e.key.toLowerCase() === 'y') ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')
            ) {
                e.preventDefault();
                self.redo();
            }
        });
    };
}
