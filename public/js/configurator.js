var configurator = new function () {
  var self = this;

  this.savedRobot = null;

  this.bodyTemplate = {
    defaultConfig: {
      bodyHeight: 4,
      bodyWidth: 14,
      bodyLength: 16,
      wheels: true,
      wheelDiameter: 5.6,
      wheelWidth: 0.8,
      wheelToBodyOffset: 0.2,
      bodyEdgeToWheelCenterY: 1,
      bodyEdgeToWheelCenterZ: 2,
      caster: true,
      casterDiameter: 0,
      bodyMass: 1000,
      wheelMass: 200,
      casterMass: 0,
      wheelFriction: 10,
      bodyFriction: 0,
      casterFriction: 0,
      casterOffsetZ: 0,
      color: '#F09C0D',
      bodyModelURL: '',
      bodyModelScale: 1,
      bodyModelRotation: [0, 0, 0],
      bodyModelPosition: [0, 0, 0],
      _bodyModelFileName: '',
    },
    optionsConfigurations: [
      {
        option: 'bodyModelURL',
        type: 'selectModelFile',
        reset: true,
        help: 'Select a 3D model file (.glb or .gltf) to replace the default box body. Leave empty to use default box.'
      },
      {
        option: 'bodyModelScale',
        type: 'slider',
        min: '0.1',
        max: '50',
        step: '0.1',
        reset: true,
        help: 'Scale of the 3D body model'
      },
      {
        option: 'bodyModelRotation',
        type: 'vectors',
        min: '-180',
        max: '180',
        step: '5',
        deg2rad: true,
        reset: true,
        help: 'Rotation of the 3D body model (X, Y, Z in degrees)'
      },
      {
        option: 'bodyModelPosition',
        type: 'vectors',
        min: '-20',
        max: '20',
        step: '0.5',
        reset: true,
        help: 'Position offset of the 3D body model (X, Y, Z)'
      },
      {
        option: 'bodyHeight',
        type: 'slider',
        min: '1',
        max: '20',
        step: '0.5',
        reset: true
      },
      {
        option: 'bodyWidth',
        type: 'slider',
        min: '1',
        max: '20',
        step: '0.5',
        reset: true
      },
      {
        option: 'bodyLength',
        type: 'slider',
        min: '1',
        max: '30',
        step: '0.5',
        reset: true
      },
      {
        option: 'wheels',
        type: 'boolean',
        reset: true
      },
      {
        option: 'wheelDiameter',
        type: 'slider',
        min: '1',
        max: '10',
        step: '0.1',
        reset: true
      },
      {
        option: 'wheelWidth',
        type: 'slider',
        min: '0.2',
        max: '4',
        step: '0.1',
        reset: true
      },
      {
        option: 'wheelToBodyOffset',
        type: 'slider',
        min: '0.1',
        max: '2',
        step: '0.1',
        reset: true
      },
      {
        option: 'bodyEdgeToWheelCenterY',
        type: 'slider',
        min: '0.1',
        max: '5',
        step: '0.1',
        reset: true
      },
      {
        option: 'bodyEdgeToWheelCenterZ',
        type: 'slider',
        min: '0.1',
        max: '20',
        step: '0.1',
        reset: true
      },
      {
        option: 'caster',
        type: 'boolean',
        reset: true
      },
      {
        option: 'casterDiameter',
        type: 'slider',
        min: '0',
        max: '10',
        step: '0.1',
        reset: true,
        help: 'Set to 0 to use wheel diameter'
      },
      {
        option: 'casterOffsetZ',
        type: 'slider',
        min: '0',
        max: '20',
        step: '0.5',
        reset: true,
      },
      {
        option: 'color',
        type: 'color',
        help: 'Color in hex',
        reset: true
      },
      {
        option: 'imageType',
        type: 'select',
        options: [
          ['None', 'none'],
          ['Repeat on every face', 'repeat'],
          ['Only on top face', 'top'],
          ['Only on front face', 'front'],
          ['Map across all faces', 'all']
        ],
        reset: true
      },
      {
        option: 'imageURL',
        type: 'selectImage',
        reset: true
      },
      {
        option: 'imageURL',
        type: 'strText',
        reset: true,
        help: 'URL for robot body image. Will not work with most webhosts; Imgur will work.'
      },
      {
        option: 'bodyMass',
        type: 'floatText',
      }
    ]
  };

  this.componentTemplates = [
    {
      name: 'Box',
      category: 'Blocks',
      defaultConfig: {
        type: 'Box',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          height: 1,
          width: 1,
          depth: 1,
          color: 'A3CF0D',
          imageType: 'repeat',
          imageURL: '',
          uScale: 1,
          vScale: 1
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'height',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'width',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'depth',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'color',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'imageType',
          type: 'select',
          options: [
            ['None', 'none'],
            ['Repeat on every face', 'repeat'],
            ['Only on top face', 'top'],
            ['Only on front face', 'front'],
            ['Map across all faces', 'all']
          ],
          reset: true
        },
        {
          option: 'imageURL',
          type: 'selectImage',
          reset: true
        },
        {
          option: 'imageURL',
          type: 'strText',
          reset: true,
          help: 'URL for image texture. Will not work with most webhosts; Imgur will work.'
        },
      ]
    },
    {
      name: 'Cylinder',
      category: 'Blocks',
      defaultConfig: {
        type: 'Cylinder',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          height: 1,
          diameter: 1,
          color: 'A3CF0D',
          imageType: 'cylinder',
          imageURL: '',
          uScale: 1,
          vScale: 1
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'height',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'diameter',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'color',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'imageURL',
          type: 'selectImage',
          reset: true
        },
        {
          option: 'imageURL',
          type: 'strText',
          reset: true,
          help: 'URL for image texture. Will not work with most webhosts; Imgur will work.'
        },
      ]
    },
    {
      name: 'Sphere',
      category: 'Blocks',
      defaultConfig: {
        type: 'Sphere',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          diameter: 1,
          color: 'A3CF0D',
          imageType: 'sphere',
          imageURL: '',
          uScale: 1,
          vScale: 1
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'diameter',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'color',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'imageURL',
          type: 'selectImage',
          reset: true
        },
        {
          option: 'imageURL',
          type: 'strText',
          reset: true,
          help: 'URL for image texture. Will not work with most webhosts; Imgur will work.'
        },
      ]
    },
    {
      name: 'ColorSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'ColorSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'sensorMinRange',
          type: 'floatText',
          help: 'Anything nearer than this will not be detected. Leave blank to use default.'
        },
        {
          option: 'sensorMaxRange',
          type: 'floatText',
          help: 'Anything further than this will not be detected. Leave blank to use default.'
        },
        {
          option: 'sensorFov',
          type: 'floatText',
          help: 'Field of View in radians. Leave blank to use default.'
        },
      ]
    },
    {
      name: 'UltrasonicSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'UltrasonicSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'rayLength',
          type: 'floatText',
          help: 'Anything further than this will not be detected. Leave blank to use default.'
        },
        {
          option: 'rayIncidentLimit',
          type: 'floatText',
          help: 'Ignore object if angle of incident (radian) is greater than this. Leave blank to use default.'
        },
      ]
    },
    {
      name: 'LaserRangeSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'LaserRangeSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'rayLength',
          type: 'floatText',
          help: 'Anything further than this will not be detected. Leave blank to use default.'
        },
      ]
    },
    {
      name: 'LidarSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'LidarSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'rayLength',
          type: 'floatText',
          help: 'Anything further than this will not be detected. Leave blank to use default (600 cm).'
        },
        {
          option: 'rayCount',
          type: 'floatText',
          help: 'Number of rays emitted. Leave blank to use default of 360 (1 ray per degree).'
        },
      ]
    },
    {
      name: 'TouchSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'TouchSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          width: 2,
          depth: 2,
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'width',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'depth',
          type: 'slider',
          min: '1',
          max: '20',
          step: '1',
          reset: true
        },
      ]
    },
    {
      name: 'GyroSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'GyroSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
      ]
    },
    {
      name: 'GPSSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'GPSSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
      ]
    },
    {
      name: 'CameraSensor',
      category: 'Sensors',
      defaultConfig: {
        type: 'CameraSensor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'sensorMinRange',
          type: 'floatText',
          help: 'Anything nearer than this will not be detected. Leave blank to use default.'
        },
        {
          option: 'sensorFov',
          type: 'floatText',
          help: 'Field of View in radians. Leave blank to use default.'
        },
      ]
    },
    {
      name: 'MagnetActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'MagnetActuator',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'maxRange',
          type: 'floatText',
          help: 'Anything further than this will not be attracted. Leave blank to use default.'
        },
        {
          option: 'maxPower',
          type: 'floatText',
          help: 'Maximum attraction force. Actual will be lower due to distance falloff. Leave blank to use default.'
        },
        {
          option: 'dGain',
          type: 'floatText',
          help: 'Positive gain used to reduce wobbling of objects being attracted. Leave blank to use default of none (0).'
        }
      ]
    },
    {
      name: 'ArmActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'ArmActuator',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        components: [],
        options: {
          armLength: 18,
          minAngle: -5,
          maxAngle: 180,
          mass: 100,
          startAngle: 0,
          baseColor: 'A39C0D',
          pivotColor: '808080',
          armColor: 'A3CF0D',
          imageType: 'repeat',
          imageURL: '',
          uScale: 1,
          vScale: 1,
          restitution: 0.4,
          friction: 0.1
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'armLength',
          type: 'floatText',
          help: 'Length of arm in cm. Leave blank to use default.',
          reset: true
        },
        {
          option: 'baseColor',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'pivotColor',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'armColor',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'imageType',
          type: 'select',
          options: [
            ['None', 'none'],
            ['Repeat on every face', 'repeat'],
            ['Only on top face', 'top'],
            ['Only on front face', 'front'],
            ['Map across all faces', 'all']
          ],
          reset: true
        },
        {
          option: 'imageURL',
          type: 'selectImage',
          reset: true
        },
        {
          option: 'imageURL',
          type: 'strText',
          reset: true,
          help: 'URL for image texture. Will not work with most webhosts; Imgur will work.'
        },
        {
          option: 'minAngle',
          type: 'floatText',
          help: 'Lowest possible angle for arm. Leave blank to use default.'
        },
        {
          option: 'maxAngle',
          type: 'floatText',
          help: 'Highest possible angle for arm. Leave blank to use default.'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'If chaining actuators, it\'s recommended to reduce mass of child actuators'
        },
        {
          option: 'startAngle',
          type: 'floatText',
          reset: true
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'This will also apply to all child objects'
        },
      ]
    },
    {
      name: 'SwivelActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'SwivelActuator',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        components: [],
        options: {
          mass: 100,
          baseColor: 'A39C0D',
          platformColor: '808080',
          width: 3,
          restitution: 0.4,
          friction: 0.1
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'baseColor',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'platformColor',
          type: 'color',
          help: 'Color in hex',
          reset: true
        },
        {
          option: 'width',
          type: 'slider',
          min: '1',
          max: '20',
          step: '0.5',
          reset: true,
          help: 'Width of the base'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'If chaining actuators, it\'s recommended to reduce mass of child actuators'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'This will also apply to all child objects'
        },
      ]
    },
    {
      name: 'MotorActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'MotorActuator',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        components: [],
        options: {
          mass: 100,
          housingColor: '555555',
          shaftColor: 'CCCCCC',
          housingSize: [3, 3, 3],
          shaftDiameter: 1,
          shaftLength: 2,
          shaftOffset: [0, 2.5, 0],
          shaftAxis: [0, 1, 0],
          showShaft: true,
          modelURL: '',
          modelScale: 10,
          modelColor: '',
          restitution: 0.4,
          friction: 0.1
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.stl, .glb, or .gltf) for the motor housing'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model (leave blank to use model default)',
          reset: true
        },
        {
          option: 'housingColor',
          type: 'color',
          help: 'Color of the fallback housing box (used when no model is loaded)',
          reset: true
        },
        {
          option: 'housingSize',
          type: 'vectors',
          min: '0.5',
          max: '20',
          step: '0.5',
          reset: true,
          help: 'Width, Height, Depth of the invisible housing physics box'
        },
        {
          option: 'shaftOffset',
          type: 'vectors',
          min: '-10',
          max: '10',
          step: '0.1',
          reset: true,
          help: 'Offset from housing center to shaft center (X, Y, Z in cm)'
        },
        {
          option: 'shaftAxis',
          type: 'vectors',
          min: '-1',
          max: '1',
          step: '0.1',
          reset: true,
          help: 'Rotation axis direction vector. Y=[0,1,0] for vertical rotation.'
        },
        {
          option: 'shaftDiameter',
          type: 'slider',
          min: '0.1',
          max: '5',
          step: '0.1',
          reset: true,
          help: 'Diameter of the shaft cylinder'
        },
        {
          option: 'shaftLength',
          type: 'slider',
          min: '0.1',
          max: '10',
          step: '0.1',
          reset: true,
          help: 'Length of the shaft cylinder'
        },
        {
          option: 'shaftColor',
          type: 'color',
          help: 'Color of the visible shaft',
          reset: true
        },
        {
          option: 'showShaft',
          type: 'boolean',
          help: 'Show the shaft cylinder (useful for positioning)'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'If chaining actuators, it\'s recommended to reduce mass of child actuators'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'This will also apply to all child objects'
        },
      ]
    },
    {
      name: 'LinearActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'LinearActuator',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        components: [],
        options: {
          mass: 100,
          restitution: 0.1,
          friction: 1,
          degreesPerCm: 360,
          width: 2,
          baseColor: 'A39C0D',
          baseLength: 5,
          baseThickness: 1,
          platformLength: 2,
          platformThickness: 1,
          platformColor: '808080',
          max: 10,
          min: -10,
          startPos: 0,
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'If chaining actuators, it\'s recommended to reduce mass of child actuators'
        },
        {
          option: 'degreesPerCm',
          type: 'floatText',
          help: 'The degrees of rotation required to produce one cm of linear movement'
        },
        {
          option: 'baseColor',
          type: 'color',
          reset: true
        },
        {
          option: 'width',
          type: 'slider',
          min: '0',
          max: '5',
          step: '0.1',
          reset: true,
          help: 'Width of both the base and moving platform'
        },
        {
          option: 'baseLength',
          type: 'slider',
          min: '1',
          max: '20',
          step: '0.5',
          reset: true,
          help: 'Length of the base'
        },
        {
          option: 'baseThickness',
          type: 'slider',
          min: '0',
          max: '5',
          step: '0.1',
          reset: true,
        },
        {
          option: 'platformColor',
          type: 'color',
          reset: true
        },
        {
          option: 'platformLength',
          type: 'slider',
          min: '0',
          max: '5',
          step: '0.1',
          reset: true,
        },
        {
          option: 'platformThickness',
          type: 'slider',
          min: '0',
          max: '5',
          step: '0.1',
          reset: true,
        },
        {
          option: 'startPos',
          type: 'slider',
          min: '-10',
          max: '10',
          step: '0.5',
          reset: true,
          help: 'Starting position of the moving platform'
        },
        {
          option: 'max',
          type: 'floatText',
          help: 'Max position'
        },
        {
          option: 'min',
          type: 'floatText',
          help: 'Min position'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'This will also apply to all child objects'
        },
      ]
    },
    {
      name: 'PaintballLauncherActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'PaintballLauncherActuator',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: null
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'drawBackLimit',
          type: 'floatText',
          help: 'The limit that you can pull back the spring in degrees. Leave blank to use default.'
        },
        {
          option: 'powerScale',
          type: 'floatText',
          help: 'This is multiplied by the spring drawback to determine the initial velocity of the paintball. Leave blank to use default.'
        },
        {
          option: 'maxSpeed',
          type: 'floatText',
          help: 'Maximum rotation speed of the motor. NOT the maximum speed of the paintball. Leave blank to use default.'
        },
        {
          option: 'color',
          type: 'intText',
          help: 'Color of the paintball. From 0 to 5, they are Cyan, Green, Yellow, Red, Magenta, Blue. Leave blank to use default.'
        },
        {
          option: 'ttl',
          type: 'intText',
          help: 'Time-To-Live in milliseconds. After this duration, the paintball will be removed. Leave blank to use default.'
        },
        {
          option: 'ammo',
          type: 'intText',
          help: 'Amount of ammo available to the launcher at start. Set to "-1" for unlimited ammo. Leave blank to use default.'
        },
        {
          option: 'splatterTTL',
          type: 'intText',
          help: 'Time-To-Live in milliseconds for the paint splatter. After this duration, the paint splatter will be removed. Set a negative number to last forever. Leave blank to use default.'
        },
        {
          option: 'splatterVisibleToSensors',
          type: 'boolean',
          help: 'If true, the paint splatter will be visible to color and camera sensors.'
        },
      ]
    },
    {
      name: 'WheelActuator',
      category: 'Actuators',
      defaultConfig: {
        type: 'WheelActuator',
        position: [0, 0, 2.8],
        rotation: [0, 0, 0],
        components: [],
        options: {
          diameter: 5.6,
          width: 0.8,
          mass: 200,
          friction: 10,
          restitution: 0.8
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'diameter',
          type: 'slider',
          min: '1',
          max: '10',
          step: '0.1',
          reset: true
        },
        {
          option: 'width',
          type: 'slider',
          min: '0.2',
          max: '4',
          step: '0.1',
          reset: true
        },
        {
          option: 'mass',
          type: 'floatText',
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '10',
          step: '0.1',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
      ]
    },
    {
      name: 'WheelPassive',
      category: 'Others',
      defaultConfig: {
        type: 'WheelPassive',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        components: [],
        options: {
          diameter: 5.6,
          width: 0.8,
          mass: 200,
          friction: 10,
          restitution: 0.8
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'diameter',
          type: 'slider',
          min: '1',
          max: '10',
          step: '0.1',
          reset: true
        },
        {
          option: 'width',
          type: 'slider',
          min: '0.2',
          max: '4',
          step: '0.1',
          reset: true
        },
        {
          option: 'mass',
          type: 'floatText',
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '10',
          step: '0.1',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
      ]
    },
    {
      name: 'Pen',
      category: 'Others',
      defaultConfig: {
        type: 'Pen',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          doubleSided: false,
          traceVisibleToSensors: false
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'doubleSided',
          type: 'boolean',
          help: 'If true, the drawn trace will be visible from both sides.'
        },
        {
          option: 'traceVisibleToSensors',
          type: 'boolean',
          help: 'If true, the drawn trace will be visible to color and camera sensors.'
        }
      ]
    },
    {
      name: 'Robot Character',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: 'models/Kenny.nl - Characters/robot.glb',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf)'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
    {
      name: 'Robot 2',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: 'models/Kenny.nl - Characters/robot2.glb',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf)'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
    {
      name: 'Robot 3',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: 'models/Kenny.nl - Characters/robot3.glb',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf)'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
    {
      name: 'Race Car',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: 'models/Kenny.nl - Cars/race.glb',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf)'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
    {
      name: 'Fire Truck',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: 'models/Kenny.nl - Cars/firetruck.glb',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf)'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
    {
      name: 'Dog',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: 'models/Quaternius - Animals/Dog.glb',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf)'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
    {
      name: 'Custom 3D Model',
      category: 'Models',
      defaultConfig: {
        type: 'Model',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        options: {
          modelURL: '',
          modelScale: 5,
          mass: 1,
          restitution: 0.4,
          friction: 0.1,
          modelAnimation: 'None',
          modelColor: '#A3CF0D',
        }
      },
      optionsConfigurations: [
        {
          option: 'position',
          type: 'vectors',
          min: '-20',
          max: '20',
          step: '1',
          reset: true
        },
        {
          option: 'rotation',
          type: 'vectors',
          min: '-180',
          max: '180',
          step: '5',
          deg2rad: true,
          reset: true
        },
        {
          option: 'modelURL',
          type: 'selectModelFile',
          reset: true,
          help: 'Select a 3D model file (.glb or .gltf) from your computer or from the built-in library.'
        },
        {
          option: 'modelScale',
          type: 'slider',
          min: '0.1',
          max: '50',
          step: '0.1',
          reset: true,
          help: 'Scale of the 3D model'
        },
        {
          option: 'mass',
          type: 'floatText',
          help: 'Mass of the model. Set to 0 for static (immovable).'
        },
        {
          option: 'friction',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
        },
        {
          option: 'restitution',
          type: 'slider',
          min: '0',
          max: '1',
          step: '0.05',
          help: 'Bounciness of the model'
        },
        {
          option: 'modelColor',
          type: 'color',
          help: 'Color of the 3D model',
          reset: true
        },
      ]
    },
  ];

  // Run on page load
  this.init = function () {
    if (typeof babylon.scene == 'undefined') {
      setTimeout(self.init, 500);
      return;
    }

    self.$navs = $('nav li');
    self.$panelControls = $('.panelControlsArea .panelControls');
    self.$panels = $('.panels .panel');
    self.$fileMenu = $('.fileMenu');
    self.$robotMenu = $('.robotMenu');
    self.$snapMenu = $('.snapMenu');

    self.$robotName = $('#robotName');

    self.$addComponent = $('.addComponent');
    self.$deleteComponent = $('.deleteComponent');
    self.$componentList = $('.componentsList');
    self.$settingsArea = $('.settingsArea');
    self.$undo = $('.undo');
    self.$redo = $('.redo');

    self.$navs.click(self.tabClicked);
    self.$fileMenu.click(self.toggleFileMenu);
    self.$robotMenu.click(self.toggleRobotMenu);
    self.$snapMenu.click(self.toggleSnapMenu);

    self.$addComponent.click(self.addComponent);
    self.$deleteComponent.click(self.deleteComponent);
    self.$undo.click(self.undo);
    self.$redo.click(self.redo);

    self.$robotName.change(self.setRobotName);

    // Initialize UndoManager
    self.undoMgr = new UndoManager({
      getState: function () { return JSON.stringify(robot.options); },
      setState: function (s) { robot.options = JSON.parse(s); },
      onStateChange: function () { self.resetScene(); },
      onStackChange: function () { self.updateUndoRedoButtons(); },
      maxHistory: 50
    });
    self.undoMgr.setupKeyboardShortcuts();

    // Camera preset buttons
    $('.cameraPresetBtn').click(function () {
      var preset = $(this).data('preset');
      cameraUtils.setCameraPreset(preset);
    });

    babylon.scene.physicsEnabled = false;
    babylon.setCameraMode('arc')
    babylon.renders.push(self.render);

    // Initialize Gizmo
    self.gizmo = new CustomGizmo(babylon.scene);
    self.gizmoMode = 'moveFree'; // 'moveFree' | 'movePlane' | 'move' | 'rotate' | 'scale'

    // Gizmo Toolbar
    self.setupGizmoToolbar();

    // Initialize View Cube
    viewCube.init(document.querySelector('.panel.active'));

    // Install Quick Snap (Q key)
    if (typeof SnapManager !== 'undefined') {
      SnapManager.installQuickSnapKey(
        function () { return robot.components || []; },
        babylon.scene,
        function (movedComponent) {
          // After quick snap: write mesh position/rotation back to data model
          if (movedComponent && movedComponent.body) {
            var mesh = movedComponent.body;
            // Find the component data in robot.options.components via componentIndex
            var compData = null;
            if (typeof movedComponent.componentIndex !== 'undefined' && robot.options && robot.options.components) {
              compData = robot.options.components[movedComponent.componentIndex];
            }
            if (compData) {
              // Position: BJS (x, y, z) → Descartes (x, z, y)
              var pos = mesh.position;
              if (mesh.parent && typeof mesh.component !== 'undefined' && typeof mesh.component.parent !== 'undefined') {
                pos = pos.subtract(mesh.component.parent.absolutePosition);
              }
              compData.position[0] = pos.x;
              compData.position[1] = pos.z;
              compData.position[2] = pos.y;

              // Rotation: BJS Euler (radians) → Descartes with RHR negation
              var rot = mesh.rotationQuaternion
                ? mesh.rotationQuaternion.toEulerAngles()
                : mesh.rotation;
              compData.rotation[0] = -rot.x;
              compData.rotation[1] = -rot.z;
              compData.rotation[2] = -rot.y;
            }
          }
          self.saveHistory();
          self.resetScene(false);
        }
      );
    }

    self.resetScene();
    self.saveRobotOptions();

    // Setup double-click auto-focus
    cameraUtils.setupDoubleClickFocus();
  };

  // Apply gizmo to selected component mesh
  this.applyGizmoToSelected = function () {
    let selected = self.$componentList.find('li.selected');
    if (selected.length < 1) {
      if (self.gizmo) self.gizmo.detach();
      if (typeof SnapManager !== 'undefined') SnapManager.hideProximityPreview();
      return;
    }

    let index = selected[0].componentIndex;
    if (typeof index == 'undefined') {
      if (self.gizmo) self.gizmo.detach();
      return;
    }

    let component = robot.getComponentByIndex(index);
    if (!component || !component.body) {
      if (self.gizmo) self.gizmo.detach();
      return;
    }

    let dragBody = component.body;
    let componentData = selected[0].component;
    if (typeof componentData == 'undefined') {
      if (self.gizmo) self.gizmo.detach();
      return;
    }

    function notClose(a, b) {
      return Math.abs(a - b) > 0.01;
    }

    self.gizmo.attach(dragBody, {
      mode: self.gizmoMode,
      scaleFactor: 0.06,
      onDragStart: function (axisName) {
        // Hide preview during drag (drag indicators will show instead)
        if (typeof SnapManager !== 'undefined') SnapManager.hideProximityPreview();
      },
      onSnapCheck: function (mesh) {
        if (!self.magneticSnap || typeof SnapManager === 'undefined') return null;
        // Find the component being dragged
        var draggedComponent = mesh.component;
        if (!draggedComponent) return null;
        // Gather all other components from the robot
        var allComponents = robot.components || [];
        return SnapManager.findNearestSnap(draggedComponent, allComponents);
      },
      onDragEnd: function (axisName, result) {
        self.saveHistory();

        if (self.gizmoMode === 'rotate') {
          // result = Euler rotation from BabylonJS (radians)
          // Configurator stores rotation in radians (slider has deg2rad flag for display)
          // Map BJS → Descartes (X=X, Y=Z, Z=Y) with Right-Hand Rule (negate)
          if (componentData.rotation) {
            componentData.rotation[0] = -result.x;
            componentData.rotation[1] = -result.z;
            componentData.rotation[2] = -result.y;
          }
        } else if (self.gizmoMode === 'scale') {
          // result = BJS scaling vector (x, y, z)
          // Map BJS scaling → component options
          // BJS X=Descartes X, BJS Y=Descartes Z, BJS Z=Descartes Y
          var opts = componentData.options || {};

          // Determine which size properties exist and apply scale
          // For uniform-scale components (Model), use average
          if (typeof opts.modelScale !== 'undefined') {
            var avgScale = (result.x + result.y + result.z) / 3;
            opts.modelScale = Math.max(0.1, opts.modelScale * avgScale);
          } else {
            // Width → BJS X, Depth → BJS Z (Descartes Y), Height → BJS Y (Descartes Z)
            if (typeof opts.width !== 'undefined') {
              opts.width = Math.max(0.1, Math.round(opts.width * result.x * 10) / 10);
            }
            if (typeof opts.depth !== 'undefined') {
              opts.depth = Math.max(0.1, Math.round(opts.depth * result.z * 10) / 10);
            }
            if (typeof opts.height !== 'undefined') {
              opts.height = Math.max(0.1, Math.round(opts.height * result.y * 10) / 10);
            }
            if (typeof opts.diameter !== 'undefined') {
              // Diameter scales with X (or average of X/Z for uniform radial)
              var radialScale = (result.x + result.z) / 2;
              opts.diameter = Math.max(0.1, Math.round(opts.diameter * radialScale * 10) / 10);
            }
            if (typeof opts.radius !== 'undefined') {
              var radialScale2 = (result.x + result.z) / 2;
              opts.radius = Math.max(0.1, Math.round(opts.radius * radialScale2 * 10) / 10);
            }
          }
        } else {
          // result = position
          let pos = dragBody.position;

          if (dragBody.parent == null && typeof dragBody.component != 'undefined' && typeof dragBody.component.parent != 'undefined') {
            pos = pos.subtract(dragBody.component.parent.absolutePosition);
          }

          // Map BabylonJS coords → Descartes coords (X=X, Y=Z, Z=Y)
          if (notClose(componentData.position[0], pos.x)) {
            componentData.position[0] = self.roundToSnap(pos.x, self.snapStep[0]);
          }
          if (notClose(componentData.position[1], pos.z)) {
            componentData.position[1] = self.roundToSnap(pos.z, self.snapStep[1]);
          }
          if (notClose(componentData.position[2], pos.y)) {
            componentData.position[2] = self.roundToSnap(pos.y, self.snapStep[2]);
          }
        }

        self.resetScene(false);

        // Re-show proximity preview after drag
        if (typeof SnapManager !== 'undefined' && self.magneticSnap && component) {
          SnapManager.showProximityPreview(component, robot.components || [], babylon.scene);
        }
      }
    });

    // Show proximity preview on selection
    if (typeof SnapManager !== 'undefined' && self.magneticSnap) {
      SnapManager.showProximityPreview(component, robot.components || [], babylon.scene);
    }
  };

  // Legacy alias (applyDragToSelected) — now delegates to gizmo
  this.applyDragToSelected = function () {
    self.applyGizmoToSelected();
  };

  // Runs every frame
  this.render = function (delta) {
    if (self.wireframe && typeof self.wireframe.body != 'undefined') {
      self.wireframe.body.computeWorldMatrix(true);
      // Sync wireframe position/rotation with body
      self.wireframe.position.copyFrom(self.wireframe.body.absolutePosition);
      if (self.wireframe.body.absoluteRotationQuaternion) {
        if (!self.wireframe.rotationQuaternion) {
          self.wireframe.rotationQuaternion = self.wireframe.body.absoluteRotationQuaternion.clone();
        } else {
          self.wireframe.rotationQuaternion.copyFrom(self.wireframe.body.absoluteRotationQuaternion);
        }
      }
    }

    // Update gizmo position/scale
    if (self.gizmo) self.gizmo.update();

    // Update view cube rotation
    viewCube.update();
  }

  // Setup gizmo toolbar (Move modes / Rotate / Scale buttons + keyboard shortcuts)
  this.setupGizmoToolbar = function () {
    var $toolbar = $('.gizmoToolbar');
    var $buttons = $toolbar.find('.gizmoToolBtn');

    $buttons.each(function () {
      var $btn = $(this);
      var mode = $btn.data('mode');

      if (mode) {
        $btn.removeClass('disabled');
        $btn.click(function () {
          self.setGizmoMode(mode);
        });
      }
    });

    // Keyboard shortcuts: W = cycle Move modes, E = Rotate, R = Scale
    $(document).on('keydown', function (e) {
      // Don't trigger when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'w' || e.key === 'W') {
        // Cycle through move modes: moveFree → movePlane → move → moveFree
        var moveModes = ['moveFree', 'movePlane', 'move'];
        var idx = moveModes.indexOf(self.gizmoMode);
        self.setGizmoMode(moveModes[(idx + 1) % moveModes.length]);
      } else if (e.key === 'e' || e.key === 'E') {
        self.setGizmoMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        self.setGizmoMode('scale');
      }
    });
  };

  // Set the active gizmo mode and update toolbar UI
  this.setGizmoMode = function (mode) {
    self.gizmoMode = mode;
    var $buttons = $('.gizmoToolbar .gizmoToolBtn');
    $buttons.removeClass('active');
    $buttons.filter('[data-mode="' + mode + '"]').addClass('active');

    // Re-attach gizmo with new mode if a component is selected
    self.applyGizmoToSelected();
  };

  // Save history (delegates to UndoManager)
  this.saveHistory = function () {
    if (self.undoMgr) {
      self.undoMgr.save();
    }
  };

  // Clear history
  this.clearHistory = function () {
    if (self.undoMgr) {
      self.undoMgr.clear();
    }
  };

  // Undo
  this.undo = function () {
    if (self.undoMgr) {
      self.undoMgr.undo();
    }
  };

  // Redo
  this.redo = function () {
    if (self.undoMgr) {
      self.undoMgr.redo();
    }
  };

  // Update undo/redo button states
  this.updateUndoRedoButtons = function () {
    if (!self.$undo || !self.$redo) return;
    if (self.undoMgr && self.undoMgr.canUndo()) {
      self.$undo.removeClass('disabled').attr('title', 'Undo (Ctrl+Z)');
    } else {
      self.$undo.addClass('disabled').removeAttr('title');
    }
    if (self.undoMgr && self.undoMgr.canRedo()) {
      self.$redo.removeClass('disabled').attr('title', 'Redo (Ctrl+Y)');
    } else {
      self.$redo.addClass('disabled').removeAttr('title');
    }
  };

  // Save robot options
  this.saveRobotOptions = function () {
    self.savedRobot = JSON.parse(JSON.stringify(robot.options));
  };

  // Load robot options
  this.loadRobotOptions = function () {
    robot.options = JSON.parse(JSON.stringify(self.savedRobot));
    self.resetScene();
  };

  // Set the robot name
  this.setRobotName = function () {
    robot.options.name = self.$robotName.val();
  };

  // Show options
  this.showComponentOptions = function (component) {
    self.$settingsArea.empty();

    let genConfig = new GenConfig(self, self.$settingsArea);

    if (typeof component.options == 'undefined' || component.options == null) {
      component.options = {};
    }

    if (typeof component.bodyMass != 'undefined') { // main body
      genConfig.displayOptionsConfigurations(self.bodyTemplate, component);
    } else {
      let componentTemplate = self.componentTemplates.find(componentTemplate => componentTemplate.name == component.type);
      // Fallback: for Model components, name differs from type. Try matching by defaultConfig.type
      if (!componentTemplate) {
        componentTemplate = self.componentTemplates.find(ct => ct.defaultConfig && ct.defaultConfig.type == component.type);
      }
      if (!componentTemplate) {
        console.log('No template found for component type: ' + component.type);
        return;
      }
      componentTemplate.optionsConfigurations.forEach(function (optionConfiguration) {
        let options = component.options;
        if (optionConfiguration.option == 'position' || optionConfiguration.option == 'rotation') {
          options = component;
        }
        if (typeof genConfig.gen[optionConfiguration.type] != 'undefined') {
          self.$settingsArea.append(genConfig.gen[optionConfiguration.type](optionConfiguration, options));
        } else {
          console.log('Unrecognized configuration type');
        }
      });
    }
    if (component.type == 'Pen') {
      self.penSpecialCaseSetup(component);
    }
  };

  // Select built in images
  this.selectImage = function (opt, objectOptions) {
    let $body = $('<div class="selectImage"></div>');
    let $filter = $(
      '<div class="filter">Filter by Type: ' +
      '<select>' +
      '<option selected value="any">Any</option>' +
      '<option value="box">Box</option>' +
      '<option value="cylinder">Cylinder</option>' +
      '<option value="sphere">Sphere</option>' +
      '<option value="ground">Ground</option>' +
      '<option value="robot">Robot</option>' +
      '</select>' +
      '</div>'
    );
    let $select = $filter.find('select');
    let $imageList = $('<div class="images"></div>');

    BUILT_IN_IMAGES.forEach(function (image) {
      let basename = image.url.split('/').pop();

      let $row = $('<div class="row"></div>');
      $row.addClass(image.type);

      let $descriptionBox = $('<div class="description"></div>');
      let $basename = $('<p class="bold"></p>').text(basename + ' (' + image.type + ')');
      let $description = $('<p></p>').text(image.description);
      $descriptionBox.append($basename);
      $descriptionBox.append($description);

      let $selectBox = $('<div class="select"><button>Select</button></div>');
      let $select = $selectBox.find('button');
      $select.prop('url', image.url);

      $select.click(function (e) {
        objectOptions.imageURL = e.target.url;
        self.resetScene(false);
        $dialog.close();
      });

      $row.append($descriptionBox);
      $row.append($selectBox);
      $imageList.append($row);
    });

    $body.append($filter);
    $body.append($imageList);

    $select.change(function () {
      let filter = $select.val();

      $imageList.find('.row').removeClass('hide');
      if (filter != 'any') {
        $imageList.find(':not(.row.' + filter + ')').addClass('hide');
      }
    });

    let $buttons = $(
      '<button type="button" class="cancel btn-light">Cancel</button>'
    );

    let $dialog = dialog('Select Built-In Image', $body, $buttons);

    $buttons.click(function () { $dialog.close(); });
  };

  // Special case for the pen, add some buttons to move it to useful locations
  this.penSpecialCaseSetup = function (component) {

    function moveTo(x, y) {
      let $posDiv = self.$settingsArea.find("div.configurationTitle:contains('position')")
      // Get the input boxes for x/y/z so value changes can be made visible
      let $inputX = $posDiv.next().find('input[type=text]');
      let $inputY = $posDiv.next().next().find('input[type=text]');
      // change only X and Y vals (ground plane), Z is height from ground
      self.saveHistory();
      $inputX.val(x)
      component.position[0] = x
      $inputY.val(y)
      component.position[1] = y
      self.resetScene(false);
    };

    let $centerWheelAxisBtn = $('<div class="btn_pen">Center On Wheel Axis</div>');
    $centerWheelAxisBtn.click(function () {
      // move the pen to the center of the wheel axis
      wheelAxisCenter = robot.leftWheel.mesh.position.add(robot.rightWheel.mesh.position).scale(1 / 2.0)
      moveTo(wheelAxisCenter.x, wheelAxisCenter.z)
    });
    let $centerWheelBtn = $('<div class="btn_pen">Center On Wheel</div>');
    let nextWheelCenter = 'L';
    $centerWheelBtn.click(function () {
      // move the pen to the center of a wheel.
      // Alternate between L and R wheels (and castor?)
      if (nextWheelCenter == 'L') {
        nextWheelCenter = 'R';
        wheelCenter = robot.leftWheel.mesh.position;
      } else {
        nextWheelCenter = 'L';
        wheelCenter = robot.rightWheel.mesh.position;
      }
      moveTo(wheelCenter.x, wheelCenter.z)
    });
    let $centerCSBtn = $('<div class="btn_pen">Center On Color Sensor</div>');
    let nextColorSensor = 0;
    $centerCSBtn.click(function () {
      // Move the pen to the center of the color sensor.  If there is more
      // than one color sensor, move to the next one
      var colorSensors = []
      for (c of robot.components) {
        if (c.type == "ColorSensor") {
          colorSensors.push(c);
        }
      }
      if (colorSensors.length <= 0) {
        return;
      }
      csPos = colorSensors[nextColorSensor].position
      nextColorSensor++;
      if (nextColorSensor >= colorSensors.length) {
        nextColorSensor = 0;
      }
      moveTo(csPos.x, csPos.z)
    });

    let $btndiv = $('<div class="buttons"></div>')
    $btndiv.append($centerWheelAxisBtn);
    $btndiv.append($centerWheelBtn);
    $btndiv.append($centerCSBtn);
    self.$settingsArea.append($btndiv)
  }

  // Setup picking ray
  this.setupPickingRay = function () {
    babylon.scene.onPointerUp = function (e, hit) {
      if (e.button != 0) {
        return;
      }

      if (hit.pickedMesh != null) {
        function getComponent(mesh) {
          if (typeof mesh.component != 'undefined') {
            return mesh.component;
          } else if (mesh.parent != null) {
            return getComponent(mesh.parent);
          } else if (mesh.id == 'body') {
            return true;
          } else {
            return null;
          }
        }

        let $components = self.$componentList.find('li');

        let component = getComponent(hit.pickedMesh);
        if (component) {
          $components.removeClass('selected');
          let $target = self.$componentList.find('li[componentIndex=' + component.componentIndex + ']');
          if ($target.length > 0) {
            $target.addClass('selected');
            self.showComponentOptions($target[0].component);
          } else {
            $($components[0]).addClass('selected');
            self.showComponentOptions($components[0].component);
          }

          self.highlightSelected();
          self.applyDragToSelected();
        }
      }
    }
  };

  // Reset scene
  this.resetScene = async function (reloadComponents = true) {
    if (typeof self.cameraRadius == 'undefined') {
      self.cameraRadius = 40;
    } else {
      self.cameraRadius = babylon.scene.cameras[0].radius;
    }
    await babylon.resetScene();
    babylon.scene.physicsEnabled = false;
    self.setupPickingRay();
    babylon.scene.cameras[0].radius = self.cameraRadius;
    if (reloadComponents) {
      self.$robotName.val(robot.options.name);
      self.loadIntoComponentsWindow(robot.options);
      self.showComponentOptions(robot.options);
    }
    let $target = self.$componentList.find('li.selected');
    self.showComponentOptions($target[0].component);
    self.highlightSelected();
    self.applyDragToSelected();
  }

  // Add a new component to selected
  this.addComponent = function () {
    let $selected = self.getSelectedComponent();
    let COMPATIBLE_TYPES = ['ArmActuator', 'SwivelActuator', 'MotorActuator', 'LinearActuator', 'WheelActuator', 'WheelPassive'];
    if (
      typeof $selected[0].component.bodyMass == 'undefined'
      && COMPATIBLE_TYPES.indexOf($selected[0].component.type) == -1
    ) {
      toastMsg('Components can only be added to Body and Actuators.');
      return;
    }

    // Icon map for categories
    var CATEGORY_ICONS = {
      'Blocks': '🧱', 'Sensors': '📡', 'Actuators': '⚙️', 'Models': '🎨', 'Others': '📦'
    };

    let $body = $('<div class="catalogDialog"></div>');

    // Search bar
    let $searchRow = $('<div class="catalogSearch"></div>');
    let $searchInput = $('<input type="text" placeholder="Search components...">');
    let $searchCount = $('<span class="searchCount"></span>');
    $searchRow.append($searchInput).append($searchCount);
    $body.append($searchRow);

    // Category tabs
    let categories = [];
    self.componentTemplates.forEach(function (t) {
      if (categories.indexOf(t.category) === -1) categories.push(t.category);
    });

    let $tabs = $('<div class="catalogTabs"></div>');
    let $allTab = $('<div class="catalogTab active" data-cat="all">All</div>');
    $tabs.append($allTab);
    categories.forEach(function (cat) {
      let $tab = $('<div class="catalogTab" data-cat="' + cat + '"></div>');
      $tab.text(cat);
      $tabs.append($tab);
    });
    $body.append($tabs);

    // Card grid
    let $grid = $('<div class="catalogGrid"></div>');
    let selectedVal = null;

    self.componentTemplates.forEach(function (t) {
      var thumbSrc = CatalogThumbnails.get(t.name);
      var iconHTML = thumbSrc
        ? '<div class="cardIcon"><img src="' + thumbSrc + '" alt="' + t.name + '"></div>'
        : '<div class="cardIcon">' + (CATEGORY_ICONS[t.category] || '📦') + '</div>';
      let $card = $('<div class="catalogCard"></div>');
      $card.attr('data-name', t.name);
      $card.attr('data-category', t.category);
      $card.html(
        iconHTML +
        '<div class="cardName">' + t.name + '</div>' +
        '<div class="cardCategory">' + t.category + '</div>'
      );
      $card.click(function () {
        $grid.find('.catalogCard').removeClass('selected');
        $card.addClass('selected');
        selectedVal = t.name;
      });
      $card.dblclick(function () {
        selectedVal = t.name;
        confirmAdd();
      });
      $grid.append($card);
    });
    $body.append($grid);

    // Filter logic
    function filterCards() {
      let search = $searchInput.val().trim().toLowerCase();
      let activeCat = $tabs.find('.catalogTab.active').data('cat');
      let count = 0;
      $grid.find('.catalogCard').each(function () {
        let name = $(this).data('name').toLowerCase();
        let cat = $(this).data('category');
        let matchSearch = !search || name.indexOf(search) !== -1 || cat.toLowerCase().indexOf(search) !== -1;
        let matchCat = activeCat === 'all' || cat === activeCat;
        if (matchSearch && matchCat) {
          $(this).removeClass('hide');
          count++;
        } else {
          $(this).addClass('hide');
        }
      });
      $searchCount.text(count + ' items');
    }

    $searchInput.on('input', filterCards);
    $tabs.on('click', '.catalogTab', function () {
      $tabs.find('.catalogTab').removeClass('active');
      $(this).addClass('active');
      filterCards();
    });
    filterCards();

    // Buttons
    let $buttons = $(
      '<button type="button" class="cancel btn-light">Cancel</button>' +
      '<button type="button" class="confirm btn-success">Add</button>'
    );
    let $dialog = dialog('Add Component', $body, $buttons);

    function confirmAdd() {
      if (!selectedVal) { toastMsg('Please select a component first.'); return; }
      self.saveHistory();
      let component = self.componentTemplates.find(function (t) { return t.name === selectedVal; });
      if (typeof $selected[0].component.components == 'undefined') {
        $selected[0].component.components = [];
      }
      $selected[0].component.components.push(JSON.parse(JSON.stringify(component.defaultConfig)));
      self.resetScene();
      $dialog.close();
    }

    $buttons.siblings('.cancel').click(function () { $dialog.close(); });
    $buttons.siblings('.confirm').click(confirmAdd);

    // Auto-focus search
    setTimeout(function () { $searchInput.focus(); }, 100);
  };

  // Delete selected component
  this.deleteComponent = function () {
    let $selected = self.getSelectedComponent();
    if ($selected.text() == 'Body') {
      toastMsg('Cannot delete main body');
      return;
    }

    self.saveHistory();
    let i = $selected[0].componentParent.indexOf($selected[0].component);
    $selected[0].componentParent.splice(i, 1);
    self.resetScene();
  };

  // Get selected component
  this.getSelectedComponent = function () {
    return self.$componentList.find('li.selected');
  };

  // Select list item on click
  this.componentSelect = function (e) {
    if (typeof e.target.component != 'undefined') {
      self.$componentList.find('li').removeClass('selected');
      e.target.classList.add('selected');
      e.stopPropagation();

      self.showComponentOptions(e.target.component);
      self.highlightSelected();
      self.applyDragToSelected();
    }
  };

  // Highlight selected component
  this.highlightSelected = function () {
    let $selected = self.$componentList.find('li.selected');
    if ($selected.length < 1) {
      return;
    }

    let wireframe = babylon.scene.getMeshByID('wireframeComponentSelector');
    if (wireframe != null) {
      wireframe.dispose();
    }
    let index = $selected[0].componentIndex;
    if (typeof index != 'undefined') {
      let component = robot.getComponentByIndex(index);
      if (!component || !component.body) {
        console.warn('[configurator] highlightSelected: component or body not found for index', index);
        return;
      }
      let body = component.body;

      // Ensure world matrix is up-to-date before reading bounding info
      body.computeWorldMatrix(true);

      // Use auto-computed model bounding size if available (e.g. MotorActuator with loaded 3D model)
      // Otherwise fall back to body's own bounding box (manual housingSize for MotorActuator, or native for other components)
      let options;
      if (component.modelBoundingSize) {
        options = {
          height: component.modelBoundingSize.y,
          width: component.modelBoundingSize.x,
          depth: component.modelBoundingSize.z
        };
      } else {
        let size = body.getBoundingInfo().boundingBox.extendSize;
        options = {
          height: size.y * 2,
          width: size.x * 2,
          depth: size.z * 2
        };
      }
      let wireframeMat = new BABYLON.StandardMaterial('wireframeComponentSelectorMat', babylon.scene);
      wireframeMat.wireframe = true;
      wireframeMat.disableLighting = true;
      wireframeMat.emissiveColor = new BABYLON.Color3(0, 0, 1);

      wireframe = BABYLON.MeshBuilder.CreateBox('wireframeComponentSelector', options, babylon.scene);
      wireframe.material = wireframeMat;
      wireframe.scaling = new BABYLON.Vector3(1.05, 1.05, 1.05);
      wireframe.renderingGroupId = 1;
      wireframe.isPickable = false;

      wireframe.body = body;
      self.wireframe = wireframe;

      // Position wireframe at body's absolute position and rotation
      wireframe.position.copyFrom(body.absolutePosition);
      if (body.absoluteRotationQuaternion) {
        wireframe.rotationQuaternion = body.absoluteRotationQuaternion.clone();
      }

      // If the component has a model offset (e.g. MotorActuator with loaded 3D model),
      // transform the local offset into world space and apply it to the wireframe position.
      // This ensures the bounding box wraps the actual visual model, not just the invisible body.
      if (component.modelBoundingOffset) {
        var localOff = component.modelBoundingOffset.clone();
        if (body.absoluteRotationQuaternion) {
          // Rotate the local offset by the body's world rotation to get world-space offset
          var worldOff = BABYLON.Vector3.Zero();
          localOff.rotateByQuaternionAroundPointToRef(body.absoluteRotationQuaternion, BABYLON.Vector3.Zero(), worldOff);
          wireframe.position.addInPlace(worldOff);
        } else {
          wireframe.position.addInPlace(localOff);
        }
      }

      // Animate wireframe color
      let wireframeAnimation = new BABYLON.Animation(
        'wireframeAnimation',
        'material.emissiveColor',
        30,
        BABYLON.Animation.ANIMATIONTYPE_COLOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
      );
      var keys = [];
      keys.push({
        frame: 0,
        value: new BABYLON.Color3(0, 0, 1)
      });
      keys.push({
        frame: 15,
        value: new BABYLON.Color3(1, 0, 0)
      });
      keys.push({
        frame: 30,
        value: new BABYLON.Color3(0, 0, 1)
      });
      wireframeAnimation.setKeys(keys);
      wireframe.animations.push(wireframeAnimation);
      babylon.scene.beginAnimation(wireframe, 0, 30, true);
    }
  }

  // Load robot into components window
  this.loadIntoComponentsWindow = function (options) {
    let PORT_LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let ACTUATORS = ['MagnetActuator', 'ArmActuator', 'SwivelActuator', 'MotorActuator', 'LinearActuator', 'PaintballLauncherActuator', 'WheelActuator'];
    let DUMB_BLOCKS = ['Box', 'Cylinder', 'Sphere', 'WheelPassive', 'Model'];
    let motorCount = options.wheels ? 2 : 0;
    let sensorCount = 0;
    let componentIndex = 0;

    let $ul = $('<ul></ul>');
    let $li = $('<li class="selected">Body</li>');
    $li[0].component = options;
    $ul.append($li);

    function addComponents(components) {
      let $list = $('<ul></ul>');
      components.forEach(function (component) {
        let $item = $('<li></li>');
        $item.attr('componentIndex', componentIndex);
        let text = component.type;

        // For Model components, show filename instead of generic "Model"
        if (component.type == 'Model' && component.options) {
          if (component.options._modelFileName) {
            text = component.options._modelFileName;
          } else if (component.options.modelURL && component.options.modelURL !== '') {
            text = component.options.modelURL.split('/').pop();
          }
        }

        if (DUMB_BLOCKS.indexOf(component.type) != -1) {
          ;
        } else if (ACTUATORS.indexOf(text) != -1) {
          text += ' (out' + PORT_LETTERS[(++motorCount)] + ')';
        } else {
          text += ' (in' + (++sensorCount) + ')';
        }

        $item.text(text);
        $item[0].componentParent = components;
        $item[0].component = component;
        $item[0].componentIndex = componentIndex++;
        $list.append($item);

        if (component.components instanceof Array) {
          $list.append(addComponents(component.components));
        }
      });

      if ($list.children().length > 0) {
        return $('<li class="ulHolder"></li>').append($list);
      } else {
        return null;
      }
    }

    $ul.append(addComponents(options.components));

    $ul.find('li').click(self.componentSelect);

    self.$componentList.empty();
    self.$componentList.append($ul);
  };

  // Save robot to json file
  this.saveRobot = function () {
    if (robotTemplates.findIndex(r => r.name == robot.options.name) != -1) {
      robot.options.name = robot.options.name + ' (Custom)';
      self.$robotName.val(robot.options.name);
    }

    robot.options.shortDescription = robot.options.name;
    robot.options.longDescription = '<p>Custom robot created in the configurator.</p>';

    let wheelSpacing = Math.round((robot.options.bodyWidth + robot.options.wheelWidth + robot.options.wheelToBodyOffset * 2) * 10) / 10;
    let sensors = '';
    var i = 1;
    var sensor = null;
    while (sensor = robot.getComponentByPort('in' + i)) {
      if (sensor.type == 'ColorSensor') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-color#</li>';
      } else if (sensor.type == 'UltrasonicSensor') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-ultrasonic#</li>';
      } else if (sensor.type == 'GyroSensor') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-gyro#</li>';
      } else if (sensor.type == 'GPSSensor') {
        sensors += '<li>#robot-port# ' + i + ' : GPS</li>';
      } else if (sensor.type == 'LaserRangeSensor') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-laser#</li>';
      } else if (sensor.type == 'LidarSensor') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-lidar#</li>';
      } else if (sensor.type == 'TouchSensor') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-touch#</li>';
      } else if (sensor.type == 'Pen') {
        sensors += '<li>#robot-port# ' + i + ' : #robot-pen#</li>';
      } else {
        console.log('Unrecognized sensor type: ' + sensor.type);
      }
      i++;
    }
    let ports = robot.options.wheels ?
      '<li>#robot-port# A : #robot-leftWheel#</li>' +
      '<li>#robot-port# B : #robot-rightWheel#</li>' : "";
    let PORT_LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    //i = 3;
    i = robot.options.wheels ? 3 : 1;
    var motor = null;
    while (motor = robot.getComponentByPort('out' + PORT_LETTERS[i])) {
      if (motor.type == 'ArmActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : #robot-motorizedArm#</li>';
      } else if (motor.type == 'SwivelActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : #robot-swivel#</li>';
      } else if (motor.type == 'LinearActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : #robot-linear#</li>';
      } else if (motor.type == 'PaintballLauncherActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : #robot-paintball#</li>';
      } else if (motor.type == 'MagnetActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : #robot-electromagnet#</li>';
      } else if (motor.type == 'WheelActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : #robot-wheel#</li>';
      } else if (motor.type == 'MotorActuator') {
        ports += '<li>#robot-port# ' + PORT_LETTERS[i] + ' : Motor</li>';
      }
      i++;
    }

    robot.options.longerDescription =
      '<h3>#robot-dimensions#</h3>' +
      '<ul>' +
      '<li>#robot-wheelDiameter#: ' + robot.options.wheelDiameter + ' cm</li>' +
      '<li>#robot-wheelSpacing#: ' + wheelSpacing + ' cm</li>' +
      '</ul>' +
      '<h3>#robot-actuators#</h3>' +
      '<ul>' + ports + '</ul>' +
      '<h3>#robot-sensors#</h3>' +
      '<ul>' + sensors + '</ul>';

    robot.options.thumbnail = '';
    let jsonStr = JSON.stringify(robot.options, null, 2);
    let blob = new Blob([jsonStr], { type: 'application/json' });
    let downloadURL = URL.createObjectURL(blob);
    var hiddenElement = document.createElement('a');
    hiddenElement.href = downloadURL;
    hiddenElement.target = '_blank';
    hiddenElement.download = robot.options.name + '.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    setTimeout(function () { URL.revokeObjectURL(downloadURL); }, 1000);
  };

  // Load robot from json file
  this.loadRobotLocal = function () {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/json,.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function (e) {
      var reader = new FileReader();
      reader.onload = function () {
        robot.options = JSON.parse(this.result);
        self.clearHistory();
        self.saveHistory();
        self.resetScene();
      };
      reader.readAsText(e.target.files[0]);
    });
  };

  // Select robot from templates
  this.selectRobot = function () {
    let $body = $('<div class="selectRobot"></div>');
    let $select = $('<select></select>');
    let $description = $('<div class="description"><img class="thumbnail" width="200" height="200"><div class="text"></div></div>');
    let $configurations = $('<div class="configurations"></div>');

    function displayRobotDescriptions(robot) {
      $description.find('.text').html(i18n.get(robot.longDescription));
      if (robot.thumbnail) {
        $description.find('.thumbnail').attr('src', robot.thumbnail);
      } else {
        $description.find('.thumbnail').attr('src', 'images/robots/default_thumbnail.png');
      }

      $configurations.html(i18n.replace(robot.longerDescription));
    }

    robotTemplates.forEach(function (robotTemplate) {
      let $robot = $('<option></option>');
      $robot.prop('value', robotTemplate.name);
      $robot.text(i18n.get(robotTemplate.shortDescription));
      if (robotTemplate.name == robot.options.name) {
        $robot.attr('selected', 'selected');
        displayRobotDescriptions(robotTemplate);
      }
      $select.append($robot);
    });

    $body.append($select);
    $body.append($description);
    $body.append($configurations);

    $select.change(function () {
      let robotTemplate = robotTemplates.find(robotTemplate => robotTemplate.name == $select.val());
      displayRobotDescriptions(robotTemplate);
    });

    let $buttons = $(
      '<button type="button" class="cancel btn-light">Cancel</button>' +
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog(i18n.get('#main-select_robot#'), $body, $buttons);

    $buttons.siblings('.cancel').click(function () { $dialog.close(); });
    $buttons.siblings('.confirm').click(function () {
      robot.options = JSON.parse(JSON.stringify(robotTemplates.find(robotTemplate => robotTemplate.name == $select.val())));
      self.clearHistory();
      self.saveHistory();
      self.resetScene();
      $dialog.close();
    });
  };

  // Display current position
  this.displayPosition = function () {
    let x = Math.round(robot.body.position.x * 10) / 10;
    let y = Math.round(robot.body.position.z * 10) / 10;
    let angles = robot.body.absoluteRotationQuaternion.toEulerAngles();
    let rot = Math.round(angles.y / Math.PI * 1800) / 10;

    acknowledgeDialog({
      title: 'Robot Position',
      message: $(
        '<p>Position: ' + x + ', ' + y + '</p>' +
        '<p>Rotation: ' + rot + ' degrees</p>'
      )
    })
  };

  // Save current position
  this.savePosition = function () {
    let x = Math.round(robot.body.position.x * 10) / 10;
    let y = Math.round(robot.body.position.z * 10) / 10;
    let angles = robot.body.absoluteRotationQuaternion.toEulerAngles();
    let rot = Math.round(angles.y / Math.PI * 1800) / 10;

    if (typeof babylon.world.defaultOptions.startPosXY != 'undefined') {
      babylon.world.options.startPosXY = x + ',' + y;
    } else {
      toastMsg('Current world doesn\'t allow saving of position');
      return;
    }
    if (typeof babylon.world.defaultOptions.startRot != 'undefined') {
      babylon.world.options.startRot = rot.toString();
    } else {
      toastMsg('Current world doesn\'t allow saving of rotation');
    }
    babylon.world.setOptions();
  };

  // Clear current position
  this.clearPosition = function () {
    if (babylon.world.options.startPosXY) {
      babylon.world.options.startPosXY = '';
    }
    if (babylon.world.options.startRot) {
      babylon.world.options.startRot = '';
    }
    babylon.world.setOptions();
  };

  // Toggle filemenu
  this.toggleFileMenu = function (e) {
    if ($('.fileMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        { html: 'Load from file', line: false, callback: self.loadRobotLocal },
        { html: 'Save to file', line: true, callback: self.saveRobot },
      ];

      menuDropDown(self.$fileMenu, menuItems, { className: 'fileMenuDropDown' });
    }
  };

  // Toggle robotmenu
  this.toggleRobotMenu = function (e) {
    if ($('.robotMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        { html: 'Select Robot', line: false, callback: self.selectRobot },
      ];

      menuDropDown(self.$robotMenu, menuItems, { className: 'robotMenuDropDown' });
    }
  };

  // Snapping
  this.snapStep = [0, 0, 0];
  this.magneticSnap = true; // Magnetic snapping enabled by default
  this.roundToSnap = function (value, snap) {
    if (snap == 0) {
      return value;
    }
    let inv = 1.0 / snap;
    return Math.round(value * inv) / inv;
  }

  // Toggle snapmenu
  this.toggleSnapMenu = function (e) {
    if ($('.snapMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      function snapNone() {
        self.snapStep = [0, 0, 0];
      }
      function snap25() {
        self.snapStep = [0.25, 0.25, 0.25];
      }
      function snapTechnic() {
        self.snapStep = [0.4, 0.4, 0.4];
      }
      function snap05() {
        self.snapStep = [0.5, 0.5, 0.5];
      }
      function snapLego() {
        self.snapStep = [0.4, 0.4, 0.48];
      }
      function snap10() {
        self.snapStep = [1, 1, 1];
      }

      let menuItems = [
        { html: 'No Snapping', line: false, callback: snapNone },
        { html: 'Snap to 0.25cm', line: false, callback: snap25 },
        { html: 'Snap to 0.4cm (Lego Technic)', line: false, callback: snapTechnic },
        { html: 'Snap to Lego (xy: 0.4, z: 0.48)', line: false, callback: snapLego },
        { html: 'Snap to 0.5cm', line: false, callback: snap05 },
        { html: 'Snap to 1cm', line: false, callback: snap10 },
        { html: '', line: true },
        {
          html: 'Magnetic Snap', line: false, callback: function () {
            self.magneticSnap = !self.magneticSnap;
            if (typeof SnapManager !== 'undefined') SnapManager.enabled = self.magneticSnap;
          }
        },
      ];
      var tickIndex = 0;
      if (self.snapStep[2] == 0) {
        tickIndex = 0;
      } else if (self.snapStep[2] == 0.25) {
        tickIndex = 1;
      } else if (self.snapStep[2] == 0.4) {
        tickIndex = 2;
      } else if (self.snapStep[2] == 0.48) {
        tickIndex = 3;
      } else if (self.snapStep[2] == 0.5) {
        tickIndex = 4;
      } else if (self.snapStep[2] == 1) {
        tickIndex = 5;
      }
      menuItems[tickIndex].html = '<span class="tick">&#x2713;</span> ' + menuItems[tickIndex].html;
      // Magnetic snap tick
      if (self.magneticSnap) {
        menuItems[menuItems.length - 1].html = '<span class="tick">&#x2713;</span> ' + menuItems[menuItems.length - 1].html;
      }

      menuDropDown(self.$snapMenu, menuItems, { className: 'snapMenuDropDown' });
    }
  };

  // Clicked on tab
  this.tabClicked = function (tabNav) {
  };
}

// Init class
configurator.init();
