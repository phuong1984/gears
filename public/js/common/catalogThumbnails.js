/**
 * CatalogThumbnails — Isometric 3D SVG icons for the catalog dialogs.
 * Maps component/object names to inline SVG data URIs.
 * Used in both Robot Configurator and World Builder.
 */
var CatalogThumbnails = (function () {
    // Helper: wrap SVG content in a data URI
    function svgURI(inner, w, h) {
        w = w || 64; h = h || 64;
        return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">' + inner + '</svg>'
        );
    }

    // ========== SHAPES ==========

    var box = svgURI(
        '<defs><linearGradient id="bx1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFB347"/><stop offset="100%" stop-color="#E8871E"/></linearGradient>' +
        '<linearGradient id="bx2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF9F1C"/><stop offset="100%" stop-color="#C76F10"/></linearGradient></defs>' +
        '<polygon points="32,8 56,20 56,44 32,56 8,44 8,20" fill="url(#bx1)" stroke="#C76F10" stroke-width="1"/>' +
        '<polygon points="32,8 56,20 32,32 8,20" fill="#FFD08A" stroke="#C76F10" stroke-width="0.5"/>' +
        '<polygon points="32,32 56,20 56,44 32,56" fill="url(#bx2)" stroke="#C76F10" stroke-width="0.5"/>' +
        '<polygon points="32,32 8,20 8,44 32,56" fill="#E8871E" stroke="#C76F10" stroke-width="0.5"/>'
    );

    var cylinder = svgURI(
        '<defs><linearGradient id="cy1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#5BA3D9"/><stop offset="50%" stop-color="#82C4F0"/><stop offset="100%" stop-color="#4A8BC2"/></linearGradient></defs>' +
        '<ellipse cx="32" cy="16" rx="20" ry="8" fill="#A8D8F0" stroke="#3A7AB5" stroke-width="0.8"/>' +
        '<rect x="12" y="16" width="40" height="32" fill="url(#cy1)" stroke="none"/>' +
        '<ellipse cx="32" cy="48" rx="20" ry="8" fill="#4A8BC2" stroke="#3A7AB5" stroke-width="0.8"/>' +
        '<ellipse cx="32" cy="16" rx="20" ry="8" fill="#B8E4FF" stroke="#3A7AB5" stroke-width="0.8"/>' +
        '<line x1="12" y1="16" x2="12" y2="48" stroke="#3A7AB5" stroke-width="0.8"/>' +
        '<line x1="52" y1="16" x2="52" y2="48" stroke="#3A7AB5" stroke-width="0.8"/>'
    );

    var sphere = svgURI(
        '<defs><radialGradient id="sp1" cx="0.35" cy="0.35"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#E0E0E0"/><stop offset="100%" stop-color="#999999"/></radialGradient></defs>' +
        '<circle cx="32" cy="32" r="22" fill="url(#sp1)" stroke="#888" stroke-width="0.8"/>' +
        '<ellipse cx="32" cy="32" rx="22" ry="8" fill="none" stroke="#AAA" stroke-width="0.5" stroke-dasharray="3,2"/>' +
        '<ellipse cx="32" cy="32" rx="8" ry="22" fill="none" stroke="#AAA" stroke-width="0.5" stroke-dasharray="3,2" transform="rotate(20,32,32)"/>'
    );

    // ========== SENSORS ==========

    var colorSensor = svgURI(
        '<rect x="16" y="20" width="32" height="24" rx="3" fill="#4A5568" stroke="#2D3748" stroke-width="1"/>' +
        '<circle cx="32" cy="30" r="6" fill="#1A202C" stroke="#718096" stroke-width="0.5"/>' +
        '<circle cx="32" cy="30" r="3" fill="#E53E3E"/>' +
        '<rect x="24" y="42" width="4" height="6" rx="1" fill="#718096"/><rect x="36" y="42" width="4" height="6" rx="1" fill="#718096"/>' +
        '<line x1="28" y1="14" x2="28" y2="20" stroke="#FC8181" stroke-width="2" opacity="0.6"/>' +
        '<line x1="32" y1="12" x2="32" y2="20" stroke="#68D391" stroke-width="2" opacity="0.6"/>' +
        '<line x1="36" y1="14" x2="36" y2="20" stroke="#63B3ED" stroke-width="2" opacity="0.6"/>'
    );

    var ultrasonicSensor = svgURI(
        '<rect x="16" y="22" width="32" height="22" rx="3" fill="#4A5568" stroke="#2D3748" stroke-width="1"/>' +
        '<circle cx="24" cy="33" r="5" fill="#1A202C" stroke="#63B3ED" stroke-width="1"/>' +
        '<circle cx="40" cy="33" r="5" fill="#1A202C" stroke="#63B3ED" stroke-width="1"/>' +
        '<path d="M46,22 Q54,33 46,44" fill="none" stroke="#63B3ED" stroke-width="1.5" opacity="0.7"/>' +
        '<path d="M50,18 Q60,33 50,48" fill="none" stroke="#63B3ED" stroke-width="1" opacity="0.4"/>' +
        '<rect x="26" y="44" width="12" height="5" rx="1" fill="#718096"/>'
    );

    var laserRangeSensor = svgURI(
        '<rect x="18" y="24" width="28" height="18" rx="2" fill="#4A5568" stroke="#2D3748" stroke-width="1"/>' +
        '<circle cx="32" cy="33" r="4" fill="#1A202C" stroke="#E53E3E" stroke-width="1"/>' +
        '<circle cx="32" cy="33" r="1.5" fill="#E53E3E"/>' +
        '<line x1="32" y1="10" x2="32" y2="24" stroke="#E53E3E" stroke-width="1.5" opacity="0.8"/>' +
        '<circle cx="32" cy="10" r="2" fill="#E53E3E" opacity="0.5"/>' +
        '<rect x="26" y="42" width="12" height="5" rx="1" fill="#718096"/>'
    );

    var lidarSensor = svgURI(
        '<ellipse cx="32" cy="42" rx="16" ry="6" fill="#4A5568" stroke="#2D3748" stroke-width="1"/>' +
        '<rect x="20" y="30" width="24" height="12" rx="2" fill="#4A5568" stroke="#2D3748" stroke-width="0.8"/>' +
        '<ellipse cx="32" cy="24" rx="10" ry="7" fill="#2B6CB0" stroke="#2C5282" stroke-width="1"/>' +
        '<ellipse cx="32" cy="22" rx="10" ry="5" fill="#3182CE" stroke="#2C5282" stroke-width="0.5"/>' +
        '<path d="M20,20 Q10,10 20,8" fill="none" stroke="#68D391" stroke-width="1" opacity="0.6"/>' +
        '<path d="M44,20 Q54,10 44,8" fill="none" stroke="#68D391" stroke-width="1" opacity="0.6"/>'
    );

    var touchSensor = svgURI(
        '<rect x="12" y="28" width="40" height="16" rx="2" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<rect x="14" y="20" width="36" height="10" rx="2" fill="#E53E3E" stroke="#C53030" stroke-width="0.8"/>' +
        '<rect x="26" y="44" width="12" height="6" rx="1" fill="#4A5568"/>' +
        '<path d="M14,25 L32,18 L50,25" fill="none" stroke="#FC8181" stroke-width="1" opacity="0.5"/>'
    );

    var gyroSensor = svgURI(
        '<circle cx="32" cy="32" r="18" fill="none" stroke="#805AD5" stroke-width="1.5"/>' +
        '<ellipse cx="32" cy="32" rx="12" ry="16" fill="none" stroke="#B794F4" stroke-width="1.2" transform="rotate(30,32,32)"/>' +
        '<ellipse cx="32" cy="32" rx="12" ry="16" fill="none" stroke="#D6BCFA" stroke-width="1" transform="rotate(-30,32,32)"/>' +
        '<circle cx="32" cy="32" r="4" fill="#805AD5"/>' +
        '<circle cx="32" cy="32" r="2" fill="#E9D8FD"/>'
    );

    var gpsSensor = svgURI(
        '<rect x="20" y="30" width="24" height="18" rx="2" fill="#4A5568" stroke="#2D3748" stroke-width="1"/>' +
        '<line x1="32" y1="14" x2="32" y2="30" stroke="#718096" stroke-width="2"/>' +
        '<circle cx="32" cy="14" r="3" fill="#48BB78" stroke="#276749" stroke-width="0.8"/>' +
        '<path d="M24,12 L32,6 L40,12" fill="none" stroke="#68D391" stroke-width="1.5"/>' +
        '<circle cx="28" cy="38" r="1" fill="#68D391"/><circle cx="36" cy="38" r="1" fill="#68D391"/>' +
        '<rect x="26" y="48" width="12" height="4" rx="1" fill="#718096"/>'
    );

    var cameraSensor = svgURI(
        '<rect x="14" y="22" width="36" height="24" rx="3" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="32" cy="34" r="8" fill="#1A202C" stroke="#63B3ED" stroke-width="1.2"/>' +
        '<circle cx="32" cy="34" r="5" fill="#2B6CB0"/>' +
        '<circle cx="32" cy="34" r="2" fill="#BEE3F8"/>' +
        '<rect x="16" y="24" width="6" height="3" rx="1" fill="#E53E3E" opacity="0.8"/>' +
        '<circle cx="30" cy="32" r="1" fill="#FFFFFF" opacity="0.6"/>'
    );

    // ========== ACTUATORS ==========

    var magnetActuator = svgURI(
        '<path d="M18,40 L18,24 Q18,12 32,12 Q46,12 46,24 L46,40" fill="none" stroke="#E53E3E" stroke-width="6" stroke-linecap="round"/>' +
        '<rect x="14" y="36" width="10" height="12" rx="1" fill="#C53030"/>' +
        '<rect x="40" y="36" width="10" height="12" rx="1" fill="#3182CE"/>' +
        '<text x="17" y="46" font-size="7" fill="white" font-weight="bold">N</text>' +
        '<text x="43" y="46" font-size="7" fill="white" font-weight="bold">S</text>' +
        '<path d="M26,20 Q26,16 32,16 Q38,16 38,20" fill="none" stroke="#FC8181" stroke-width="1" opacity="0.5"/>'
    );

    var armActuator = svgURI(
        '<circle cx="18" cy="40" r="6" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<rect x="18" y="36" width="20" height="8" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="0.8"/>' +
        '<circle cx="38" cy="28" r="5" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<rect x="34" y="14" width="8" height="18" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="0.8" transform="rotate(10,38,28)"/>' +
        '<circle cx="18" cy="40" r="2" fill="#4A5568"/>' +
        '<circle cx="38" cy="28" r="2" fill="#4A5568"/>'
    );

    var swivelActuator = svgURI(
        '<ellipse cx="32" cy="46" rx="18" ry="6" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<rect x="22" y="34" width="20" height="12" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="0.8"/>' +
        '<ellipse cx="32" cy="34" rx="10" ry="4" fill="#CBD5E0" stroke="#718096" stroke-width="0.8"/>' +
        '<rect x="28" y="18" width="8" height="16" rx="2" fill="#4299E1" stroke="#2B6CB0" stroke-width="0.8"/>' +
        '<path d="M22,26 A14,14 0 0,1 42,26" fill="none" stroke="#63B3ED" stroke-width="1" stroke-dasharray="2,2"/>' +
        '<polygon points="42,24 44,28 40,28" fill="#63B3ED"/>'
    );

    var motorActuator = svgURI(
        '<rect x="14" y="20" width="24" height="28" rx="3" fill="#A0AEC0" stroke="#718096" stroke-width="1"/>' +
        '<circle cx="26" cy="34" r="8" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<circle cx="26" cy="34" r="3" fill="#4A5568"/>' +
        '<rect x="38" y="30" width="14" height="8" rx="1" fill="#4A5568" stroke="#2D3748" stroke-width="0.8"/>' +
        '<circle cx="52" cy="34" r="2" fill="#2D3748"/>' +
        '<rect x="16" y="22" width="8" height="3" rx="1" fill="#E53E3E" opacity="0.8"/>'
    );

    var linearActuator = svgURI(
        '<rect x="10" y="28" width="20" height="12" rx="2" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<rect x="28" y="30" width="22" height="8" rx="1" fill="#A0AEC0" stroke="#718096" stroke-width="0.8"/>' +
        '<rect x="48" y="28" width="6" height="12" rx="1" fill="#4A5568"/>' +
        '<line x1="30" y1="34" x2="46" y2="34" stroke="#718096" stroke-width="0.8" stroke-dasharray="2,1"/>' +
        '<polygon points="36,24 38,28 34,28" fill="#63B3ED"/>' +
        '<polygon points="36,44 38,40 34,40" fill="#63B3ED"/>'
    );

    var paintballLauncher = svgURI(
        '<rect x="12" y="28" width="28" height="14" rx="2" fill="#4A5568" stroke="#2D3748" stroke-width="1"/>' +
        '<rect x="38" y="30" width="16" height="10" rx="1" fill="#718096" stroke="#4A5568" stroke-width="0.8"/>' +
        '<circle cx="54" cy="35" r="3" fill="#1A202C"/>' +
        '<circle cx="26" cy="22" r="6" fill="#68D391" stroke="#38A169" stroke-width="0.8"/>' +
        '<rect x="24" y="26" width="4" height="4" fill="#4A5568"/>' +
        '<circle cx="10" cy="20" r="2" fill="#FC8181" opacity="0.7"/>' +
        '<circle cx="14" cy="16" r="1.5" fill="#68D391" opacity="0.5"/>'
    );

    var wheelActuator = svgURI(
        '<circle cx="32" cy="32" r="18" fill="#2D3748" stroke="#1A202C" stroke-width="1.5"/>' +
        '<circle cx="32" cy="32" r="14" fill="#4A5568"/>' +
        '<circle cx="32" cy="32" r="5" fill="#718096" stroke="#4A5568" stroke-width="1"/>' +
        '<circle cx="32" cy="32" r="2" fill="#A0AEC0"/>' +
        '<line x1="32" y1="18" x2="32" y2="46" stroke="#2D3748" stroke-width="1.5"/>' +
        '<line x1="18" y1="32" x2="46" y2="32" stroke="#2D3748" stroke-width="1.5"/>' +
        '<circle cx="32" cy="32" r="18" fill="none" stroke="#1A202C" stroke-width="2"/>'
    );

    var wheelPassive = svgURI(
        '<rect x="22" y="10" width="20" height="8" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="0.8"/>' +
        '<line x1="32" y1="18" x2="32" y2="28" stroke="#718096" stroke-width="2"/>' +
        '<circle cx="32" cy="38" r="14" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="32" cy="38" r="10" fill="#4A5568"/>' +
        '<circle cx="32" cy="38" r="3" fill="#718096"/>'
    );

    // ========== OTHERS ==========

    var pen = svgURI(
        '<rect x="28" y="8" width="8" height="36" rx="2" fill="#E53E3E" stroke="#C53030" stroke-width="0.8" transform="rotate(20,32,32)"/>' +
        '<polygon points="28,44 32,54 36,44" fill="#F6E05E" stroke="#D69E2E" stroke-width="0.5" transform="rotate(20,32,32)"/>' +
        '<rect x="28" y="8" width="8" height="6" rx="1" fill="#C53030" transform="rotate(20,32,32)"/>' +
        '<line x1="32" y1="52" x2="36" y2="58" stroke="#E53E3E" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>'
    );

    var customModel = svgURI(
        '<polygon points="32,8 52,18 52,38 32,48 12,38 12,18" fill="none" stroke="#805AD5" stroke-width="1.5" stroke-dasharray="3,2"/>' +
        '<line x1="32" y1="8" x2="32" y2="48" stroke="#B794F4" stroke-width="0.8" stroke-dasharray="2,2"/>' +
        '<line x1="12" y1="18" x2="52" y2="38" stroke="#B794F4" stroke-width="0.8" stroke-dasharray="2,2"/>' +
        '<line x1="52" y1="18" x2="12" y2="38" stroke="#B794F4" stroke-width="0.8" stroke-dasharray="2,2"/>' +
        '<circle cx="32" cy="28" r="3" fill="#805AD5" opacity="0.6"/>' +
        '<text x="20" y="60" font-size="8" fill="#805AD5" font-family="Arial">3D</text>'
    );

    // ========== MODELS (Robots) ==========

    var robotCharacter = svgURI(
        '<rect x="18" y="20" width="28" height="22" rx="4" fill="#4299E1" stroke="#2B6CB0" stroke-width="1"/>' +
        '<rect x="22" y="24" width="8" height="6" rx="1" fill="#BEE3F8"/>' +
        '<rect x="34" y="24" width="8" height="6" rx="1" fill="#BEE3F8"/>' +
        '<circle cx="26" cy="27" r="2" fill="#1A202C"/><circle cx="38" cy="27" r="2" fill="#1A202C"/>' +
        '<line x1="32" y1="8" x2="32" y2="20" stroke="#718096" stroke-width="2"/>' +
        '<circle cx="32" cy="8" r="3" fill="#E53E3E"/>' +
        '<circle cx="16" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="48" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<rect x="10" y="30" width="8" height="4" rx="1" fill="#A0AEC0"/>' +
        '<rect x="46" y="30" width="8" height="4" rx="1" fill="#A0AEC0"/>'
    );

    var robot2 = svgURI(
        '<rect x="16" y="22" width="32" height="18" rx="6" fill="#38B2AC" stroke="#2C7A7B" stroke-width="1"/>' +
        '<rect x="24" y="26" width="16" height="8" rx="2" fill="#1A202C"/>' +
        '<circle cx="29" cy="30" r="2" fill="#68D391"/><circle cx="35" cy="30" r="2" fill="#68D391"/>' +
        '<circle cx="14" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="50" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<rect x="20" y="40" width="24" height="6" rx="2" fill="#4FD1C5"/>' +
        '<rect x="30" y="14" width="4" height="8" rx="1" fill="#718096"/>' +
        '<circle cx="32" cy="12" r="2" fill="#E53E3E"/>'
    );

    var robot3 = svgURI(
        '<path d="M20,40 L16,22 Q16,16 32,14 Q48,16 48,22 L44,40Z" fill="#9F7AEA" stroke="#6B46C1" stroke-width="1"/>' +
        '<ellipse cx="32" cy="24" rx="10" ry="5" fill="#1A202C"/>' +
        '<circle cx="28" cy="24" r="2" fill="#F6E05E"/><circle cx="36" cy="24" r="2" fill="#F6E05E"/>' +
        '<circle cx="18" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="46" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<line x1="32" y1="8" x2="32" y2="14" stroke="#B794F4" stroke-width="1.5"/>' +
        '<circle cx="32" cy="7" r="2" fill="#F6E05E"/>'
    );

    var raceCar = svgURI(
        '<path d="M8,36 L14,28 L24,24 L40,24 L50,28 L56,36Z" fill="#E53E3E" stroke="#C53030" stroke-width="1"/>' +
        '<rect x="22" y="26" width="14" height="8" rx="1" fill="#63B3ED" stroke="#2B6CB0" stroke-width="0.5"/>' +
        '<circle cx="16" cy="40" r="6" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="48" cy="40" r="6" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="16" cy="40" r="2" fill="#718096"/><circle cx="48" cy="40" r="2" fill="#718096"/>' +
        '<rect x="46" y="28" width="8" height="4" rx="1" fill="#F6E05E"/>'
    );

    var fireTruck = svgURI(
        '<rect x="6" y="26" width="28" height="18" rx="2" fill="#E53E3E" stroke="#C53030" stroke-width="1"/>' +
        '<rect x="34" y="30" width="22" height="14" rx="2" fill="#C53030" stroke="#9B2C2C" stroke-width="0.8"/>' +
        '<rect x="36" y="32" width="8" height="6" rx="1" fill="#63B3ED"/>' +
        '<circle cx="14" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<circle cx="46" cy="48" r="5" fill="#2D3748" stroke="#1A202C" stroke-width="1"/>' +
        '<rect x="10" y="14" width="4" height="14" rx="1" fill="#A0AEC0"/>' +
        '<rect x="8" y="10" width="20" height="4" rx="1" fill="#A0AEC0" transform="rotate(-15,18,12)"/>'
    );

    var dog = svgURI(
        '<rect x="16" y="24" width="24" height="16" rx="4" fill="#D69E2E" stroke="#B7791F" stroke-width="1"/>' +
        '<circle cx="44" cy="26" r="8" fill="#ECC94B" stroke="#B7791F" stroke-width="1"/>' +
        '<circle cx="42" cy="24" r="2" fill="#1A202C"/><circle cx="47" cy="24" r="1.5" fill="#1A202C"/>' +
        '<ellipse cx="46" cy="28" rx="3" ry="2" fill="#B7791F"/>' +
        '<rect x="18" y="38" width="5" height="12" rx="1" fill="#D69E2E" stroke="#B7791F" stroke-width="0.5"/>' +
        '<rect x="26" y="38" width="5" height="12" rx="1" fill="#D69E2E" stroke="#B7791F" stroke-width="0.5"/>' +
        '<rect x="33" y="38" width="5" height="12" rx="1" fill="#D69E2E" stroke="#B7791F" stroke-width="0.5"/>' +
        '<path d="M14,30 Q8,26 10,20" fill="none" stroke="#D69E2E" stroke-width="3" stroke-linecap="round"/>'
    );

    // ========== WORLD BUILDER SPECIFICS ==========

    var compound = svgURI(
        '<polygon points="32,12 50,22 50,38 32,48 14,38 14,22" fill="#48BB78" fill-opacity="0.3" stroke="#38A169" stroke-width="1" stroke-dasharray="3,2"/>' +
        '<polygon points="32,20 42,26 42,34 32,40 22,34 22,26" fill="#48BB78" stroke="#276749" stroke-width="1"/>' +
        '<polygon points="32,24 38,28 38,32 32,36 26,32 26,28" fill="#68D391"/>'
    );

    var hinge = svgURI(
        '<rect x="8" y="26" width="20" height="12" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="1"/>' +
        '<rect x="36" y="26" width="20" height="12" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="1"/>' +
        '<circle cx="32" cy="32" r="8" fill="#718096" stroke="#4A5568" stroke-width="1.5"/>' +
        '<circle cx="32" cy="32" r="3" fill="#4A5568"/>' +
        '<circle cx="32" cy="32" r="1" fill="#A0AEC0"/>' +
        '<path d="M24,22 A10,10 0 0,1 40,22" fill="none" stroke="#63B3ED" stroke-width="1" stroke-dasharray="2,1"/>'
    );

    var ballJoint = svgURI(
        '<rect x="10" y="34" width="18" height="8" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="1"/>' +
        '<rect x="36" y="22" width="18" height="8" rx="2" fill="#A0AEC0" stroke="#718096" stroke-width="1" transform="rotate(-30,45,26)"/>' +
        '<circle cx="32" cy="32" r="10" fill="#CBD5E0" stroke="#718096" stroke-width="1"/>' +
        '<circle cx="32" cy="32" r="6" fill="#A0AEC0" stroke="#718096" stroke-width="0.8"/>' +
        '<circle cx="32" cy="32" r="3" fill="#718096"/>' +
        '<circle cx="30" cy="30" r="1" fill="#E2E8F0" opacity="0.7"/>'
    );

    var model = svgURI(
        '<polygon points="32,6 54,18 54,42 32,54 10,42 10,18" fill="none" stroke="#9F7AEA" stroke-width="1.5"/>' +
        '<line x1="32" y1="6" x2="32" y2="54" stroke="#B794F4" stroke-width="0.8"/>' +
        '<line x1="10" y1="18" x2="54" y2="42" stroke="#B794F4" stroke-width="0.8"/>' +
        '<line x1="54" y1="18" x2="10" y2="42" stroke="#B794F4" stroke-width="0.8"/>' +
        '<polygon points="32,18 42,24 42,36 32,42 22,36 22,24" fill="#9F7AEA" fill-opacity="0.3" stroke="#6B46C1" stroke-width="0.8"/>' +
        '<text x="22" y="60" font-size="7" fill="#6B46C1" font-family="Arial">MODEL</text>'
    );

    // ========== PUBLIC API ==========

    var MAP = {
        // Shapes (shared between configurator and builder)
        'Box': box,
        'Cylinder': cylinder,
        'Sphere': sphere,
        // Sensors
        'ColorSensor': colorSensor,
        'UltrasonicSensor': ultrasonicSensor,
        'LaserRangeSensor': laserRangeSensor,
        'LidarSensor': lidarSensor,
        'TouchSensor': touchSensor,
        'GyroSensor': gyroSensor,
        'GPSSensor': gpsSensor,
        'CameraSensor': cameraSensor,
        // Actuators
        'MagnetActuator': magnetActuator,
        'ArmActuator': armActuator,
        'SwivelActuator': swivelActuator,
        'MotorActuator': motorActuator,
        'LinearActuator': linearActuator,
        'PaintballLauncherActuator': paintballLauncher,
        'WheelActuator': wheelActuator,
        'WheelPassive': wheelPassive,
        // Others
        'Pen': pen,
        'Custom 3D Model': customModel,
        // Models (Robots)
        'Robot Character': robotCharacter,
        'Robot 2': robot2,
        'Robot 3': robot3,
        'Race Car': raceCar,
        'Fire Truck': fireTruck,
        'Dog': dog,
        // World Builder objects
        'Model': model,
        'Compound': compound,
        'Hinge': hinge,
        'Ball Joint': ballJoint
    };

    return {
        get: function (name) {
            return MAP[name] || null;
        },
        has: function (name) {
            return !!MAP[name];
        }
    };
})();
