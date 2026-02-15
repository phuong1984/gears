var ext_robotics_generator = new function () {
  var self = this;

  // Load Python generators - Override definition.js generators that use 'await' or hardware imports
  this.load = function () {
    Blockly.Python.INDENT = '    ';

    // Override all generators from definition.js that need simulator-specific behavior.
    // The definition.js file registers Blockly.Python[...] generators inline when it loads.
    // Some of those use 'await' (not supported in Skulpt) or set hardware-specific imports.
    // We override only the ones that are problematic; other definition.js generators
    // (like robotics_motor_run, robotics_motor_brake, robotics_motor_get, etc.)
    // produce clean code like 'motor1.run(speed)' that works fine with our sim classes.

    for (let generator in self.generators) {
      Blockly.Python.forBlock[generator] = self.generators[generator];
    }
  };

  // Generate python code with simulator imports
  this.genCode = function () {
    let workspaceCode = Blockly.Python.workspaceToCode(blockly.workspace);

    let code =
      '#!/usr/bin/env python3\n' +
      '\n' +
      '# Ext Robotics - Simulator Mode\n' +
      'import time\n' +
      'import math\n' +
      'from ext_robotics.sim_constants import *\n' +
      'from ext_robotics.sim_motor_driver import SimMotorDriver\n' +
      'from ext_robotics.sim_motor import DCMotor\n' +
      'from ext_robotics.sim_drivebase import DriveBase\n' +
      '\n' +
      '# Create motor driver\n' +
      'md_v2 = SimMotorDriver()\n' +
      '\n' +
      '# Create motors for left and right wheels\n' +
      'motor1 = DCMotor(md_v2, E1, reversed=False)\n' +
      'motor2 = DCMotor(md_v2, E2, reversed=False)\n' +
      '\n' +
      '# Create robot drive base (2WD mode)\n' +
      'robot = DriveBase(MODE_2WD, m1=motor1, m2=motor2)\n' +
      '\n' +
      '# Reset motors and wait for physics to settle\n' +
      'import simPython\n' +
      'simPython.reset_drive()\n' +
      'time.sleep(0.2)\n' +
      '\n' +
      '# --- Your program starts here ---\n\n';

    code += workspaceCode;
    return code;
  };

  //
  // Python Generators - These OVERRIDE the problematic definition.js generators
  //
  this.generators = {

    // ===== INIT BLOCKS (override hardware imports) =====

    // Start block
    'when_started': function (block) {
      return '';
    },

    // robotics_motori2c_init - OVERRIDE: don't inject hardware imports
    // In simulator mode, motors are already created in genCode() header
    'robotics_motori2c_init': function (block) {
      return '';
    },

    // robotics_motor2p_init - OVERRIDE: don't inject hardware imports
    'robotics_motor2p_init': function (block) {
      return '';
    },

    // robotics_motor3p_init - OVERRIDE: don't inject hardware imports
    'robotics_motor3p_init': function (block) {
      return '';
    },

    // robotics_robot_init - OVERRIDE: don't inject hardware imports
    // In simulator mode, DriveBase is already created in genCode() header
    'robotics_robot_init': function (block) {
      return '';
    },

    // ===== DRIVEBASE MOVEMENT BLOCKS (override 'await' usage) =====

    // robotics_robot_move - this one is fine in definition.js but we override for safety
    'robotics_robot_move': function (block) {
      var dir = block.getFieldValue('direction');
      var code = 'robot.' + dir + '()\n';
      return code;
    },

    // robotics_robot_move_delay - OVERRIDE: remove 'await' keyword
    'robotics_robot_move_delay': function (block) {
      var dir = block.getFieldValue('direction');
      var unit = block.getFieldValue('unit');
      var then = block.getFieldValue('then');
      var amount = Blockly.Python.valueToCode(block, 'amount', Blockly.Python.ORDER_ATOMIC);
      var code = 'robot.' + dir + '(' + amount + ', unit=' + unit + ', then=' + then + ')\n';
      return code;
    },

    // robotics_robot_turn_delay - OVERRIDE: remove 'await' keyword
    'robotics_robot_turn_delay': function (block) {
      var dir = block.getFieldValue('direction');
      var unit = block.getFieldValue('unit');
      var amount = Blockly.Python.valueToCode(block, 'amount', Blockly.Python.ORDER_ATOMIC);
      var then = block.getFieldValue('then');
      var code = 'robot.' + dir + '(' + amount + ', unit=' + unit + ', then=' + then + ')\n';
      return code;
    },

    // robotics_robot_stop
    'robotics_robot_stop': function (block) {
      var then = block.getFieldValue('then');
      var code = 'robot.' + then + '()\n';
      return code;
    },

    // robotics_robot_set_speed
    'robotics_robot_set_speed': function (block) {
      var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
      var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
      var code = 'robot.speed(' + speed + ', min_speed=' + min_speed + ')\n';
      return code;
    },

    // robotics_robot_use_gyro
    'robotics_robot_use_gyro': function (block) {
      var use_gyro = block.getFieldValue('use_gyro');
      var code = 'robot.use_gyro(' + use_gyro + ')\n';
      return code;
    },

    // robotics_robot_set_pid
    'robotics_robot_set_pid': function (block) {
      var kp = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
      var ki = Blockly.Python.valueToCode(block, 'KI', Blockly.Python.ORDER_ATOMIC);
      var kd = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
      var code = 'robot.pid(Kp=' + kp + ', Ki=' + ki + ', Kd=' + kd + ')\n';
      return code;
    },

    // robotics_robot_set_speed_ratio
    'robotics_robot_set_speed_ratio': function (block) {
      var front_left = Blockly.Python.valueToCode(block, 'front_left', Blockly.Python.ORDER_ATOMIC);
      var front_right = Blockly.Python.valueToCode(block, 'front_right', Blockly.Python.ORDER_ATOMIC);
      var rear_left = Blockly.Python.valueToCode(block, 'rear_left', Blockly.Python.ORDER_ATOMIC);
      var rear_right = Blockly.Python.valueToCode(block, 'rear_right', Blockly.Python.ORDER_ATOMIC);
      var code = 'robot.speed_ratio(front_left=' + front_left + ', front_right=' + front_right + ', rear_left=' + rear_left + ', rear_right=' + rear_right + ')\n';
      return code;
    },

    // robotics_robot_config
    'robotics_robot_config': function (block) {
      var wheel = Blockly.Python.valueToCode(block, 'wheel', Blockly.Python.ORDER_ATOMIC);
      var width = Blockly.Python.valueToCode(block, 'width', Blockly.Python.ORDER_ATOMIC);
      var code = 'robot.size(wheel=' + wheel + ', width=' + width + ')\n';
      return code;
    },

    // ===== MOTOR BLOCKS (override 'await' usage) =====

    // robotics_motor_run - OK in definition.js but override for consistency
    'robotics_motor_run': function (block) {
      var motor = block.getFieldValue('motor');
      var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
      var code = motor + '.run(' + speed + ')\n';
      return code;
    },

    // robotics_motor_brake - OK in definition.js
    'robotics_motor_brake': function (block) {
      var motor = block.getFieldValue('motor');
      var action = block.getFieldValue('action');
      var code = motor + '.' + action + '\n';
      return code;
    },

    // robotics_motor_run_wait - OVERRIDE: remove 'await' keyword
    'robotics_motor_run_wait': function (block) {
      var motor = block.getFieldValue('motor');
      var amount = Blockly.Python.valueToCode(block, 'amount', Blockly.Python.ORDER_ATOMIC);
      var unit = block.getFieldValue('unit');
      var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
      var code = '';
      if (unit == 'second') {
        code = motor + '.run_time(speed=' + speed + ', time_ms=' + amount + '*1000, then=STOP)\n';
      } else if (unit == 'angle') {
        code = motor + '.run_angle(speed=' + speed + ', angle=' + amount + ', then=BRAKE)\n';
      } else if (unit == 'rotation') {
        code = motor + '.run_rotation(speed=' + speed + ', rotation=' + amount + ', then=BRAKE)\n';
      }
      return code;
    },

    // robotics_motor_run_stalled - OVERRIDE: remove 'await' keyword
    'robotics_motor_run_stalled': function (block) {
      var motor = block.getFieldValue('motor');
      var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
      var code = motor + '.run_until_stalled(' + speed + ', then=STOP)\n';
      return code;
    },

    // robotics_motor_get - OK in definition.js
    'robotics_motor_get': function (block) {
      var motor = block.getFieldValue('motor');
      var property = block.getFieldValue('property');
      var code = motor + '.' + property;
      return [code, Blockly.Python.ORDER_NONE];
    },

    // robotics_motor_reset_angle - OK in definition.js
    'robotics_motor_reset_angle': function (block) {
      var motor = block.getFieldValue('motor');
      var code = motor + '.reset_angle()\n';
      return code;
    },

    // robotics_motor_set_encoder
    'robotics_motor_set_encoder': function (block) {
      var motor = block.getFieldValue('motor');
      var rpm = Blockly.Python.valueToCode(block, 'rpm', Blockly.Python.ORDER_ATOMIC);
      var ppr = Blockly.Python.valueToCode(block, 'ppr', Blockly.Python.ORDER_ATOMIC);
      var gears = Blockly.Python.valueToCode(block, 'gears', Blockly.Python.ORDER_ATOMIC);
      var code = motor + '.set_encoder(rpm=' + rpm + ', ppr=' + ppr + ', gears=' + gears + ')\n';
      return code;
    },

    // robotics_motor_set_dead_band
    'robotics_motor_set_dead_band': function (block) {
      var motor = block.getFieldValue('motor');
      var dead_band = Blockly.Python.valueToCode(block, 'dead_band', Blockly.Python.ORDER_ATOMIC);
      var code = motor + '.set_dead_band(' + dead_band + ')\n';
      return code;
    },

    // ===== SENSOR BLOCKS (stubs for simulator) =====

    // robotics_angle_sensor_init - stub
    'robotics_angle_sensor_init': function (block) {
      return '# Angle sensor not available in simulator\n';
    },

    // robotics_angle_sensor_calib - stub
    'robotics_angle_sensor_calib': function (block) {
      return '# Angle sensor calibration not available in simulator\n';
    },

    // robotics_angle_sensor_get - stub
    'robotics_angle_sensor_get': function (block) {
      return ['0', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_angle_sensor_get_imu - stub
    'robotics_angle_sensor_get_imu': function (block) {
      return ['0', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_angle_sensor_reset - stub
    'robotics_angle_sensor_reset': function (block) {
      return '# Angle sensor reset not available in simulator\n';
    },

    // robotics_angle_sensor_config - stub
    'robotics_angle_sensor_config': function (block) {
      return '';
    },

    // robotics_get_battery - stub
    'robotics_get_battery': function (block) {
      return ['12.0', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_line_sensor_i2c_init - stub
    'robotics_line_sensor_i2c_init': function (block) {
      return '# Line sensor not available in simulator\n';
    },

    // robotics_line_sensor_read_all - stub
    'robotics_line_sensor_read_all': function (block) {
      return ['[0, 0, 0]', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_line_sensor_read - stub
    'robotics_line_sensor_read': function (block) {
      return ['0', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_follow_line_until_cross - stub
    'robotics_follow_line_until_cross': function (block) {
      return '# Line following not available in simulator\n';
    },

    // robotics_turn_until_line_detected_then - stub
    'robotics_turn_until_line_detected_then': function (block) {
      return '# Line detection not available in simulator\n';
    },

    // robotics_follow_line_until_end - stub
    'robotics_follow_line_until_end': function (block) {
      return '# Line following not available in simulator\n';
    },

    // robotics_follow_line_by_time - stub
    'robotics_follow_line_by_time': function (block) {
      return '# Line following not available in simulator\n';
    },

    // robotics_follow_line_until - stub
    'robotics_follow_line_until': function (block) {
      return '# Line following not available in simulator\n';
    },

    // robotics_servo_init - stub
    'robotics_servo_init': function (block) {
      return '# Servo not available in simulator\n';
    },

    // robotics_servo_limit - stub
    'robotics_servo_limit': function (block) {
      return '';
    },

    // robotics_servo_angle - stub
    'robotics_servo_angle': function (block) {
      return '# Servo not available in simulator\n';
    },

    // robotics_servo_steps - stub
    'robotics_servo_steps': function (block) {
      return '';
    },

    // robotics_servo_spin - stub
    'robotics_servo_spin': function (block) {
      return '# Servo spin not available in simulator\n';
    },

    // robotics_remote_control_init - stub
    'robotics_remote_control_init': function (block) {
      return '# Remote control not available in simulator\n';
    },

    // robotics_remote_control_on_button - stub
    'robotics_remote_control_on_button': function (block) {
      return '# Remote control button not available in simulator\n';
    },

    // robotics_remote_control_read_button - stub
    'robotics_remote_control_read_button': function (block) {
      return ['False', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_remote_control_read_joystick - stub
    'robotics_remote_control_read_joystick': function (block) {
      return ['0', Blockly.Python.ORDER_ATOMIC];
    },

    // robotics_remote_control_side_move_mode - stub
    'robotics_remote_control_side_move_mode': function (block) {
      return '';
    },

    // robotics_remote_control_off - stub
    'robotics_remote_control_off': function (block) {
      return '';
    },

    // robotics_line_sensor_digital_init - stub
    'robotics_line_sensor_digital_init': function (block) {
      return '# Digital line sensor not available in simulator\n';
    },

    // ===== STANDARD GEARS BLOCKS =====

    // Sleep
    'sleep': function (block) {
      var value_seconds = Blockly.Python.valueToCode(block, 'seconds', Blockly.Python.ORDER_ATOMIC);
      var dropdown_units = block.getFieldValue('units');
      var code = 'time.sleep(' + value_seconds;
      if (dropdown_units == 'SECONDS') {
        code += ')\n';
      } else if (dropdown_units == 'MILLISECONDS') {
        code += ' / 1000)\n';
      }
      return code;
    },

    // Exit
    'exit': function (block) {
      var code = 'exit()\n';
      return code;
    },

    // time
    'time': function (block) {
      var code = 'time.time()';
      return [code, Blockly.Python.ORDER_ATOMIC];
    },

    // math_change
    'math_change': function (block) {
      var argument0 = Blockly.Python.valueToCode(block, 'DELTA',
        Blockly.Python.ORDER_ADDITIVE) || '0';
      var varName = Blockly.Python.nameDB_.getNameForUserVariable(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
      return varName + ' += ' + argument0 + '\n';
    },

    // set_movement_motors - Not needed in ext_robotics mode
    'set_movement_motors': function (block) {
      return '';
    },

    // comment
    'comment': function (block) {
      var text = block.getFieldValue('COMMENT') || '';
      return '# ' + text + '\n';
    },

    // wait_until
    'wait_until': function (block) {
      var condition = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_NONE) || 'True';
      var code = 'while not (' + condition + '):\n    time.sleep(0.01)\n';
      return code;
    },
  };
}
