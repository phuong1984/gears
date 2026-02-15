# DriveBase for Gears simulator
# This mirrors the ext_robotics drivebase.py API but works in the simulator
import time, math, simPython
from ext_robotics.sim_constants import *


class DriveBase:
    def __init__(self, drive_mode, m1, m2, m3=None, m4=None):
        if drive_mode not in (MODE_2WD, MODE_4WD, MODE_MECANUM):
            raise ValueError("Invalid drive mode")
        self._drive_mode = drive_mode

        self.left = []
        self.right = []
        self.left_motor_ports = 0
        self.right_motor_ports = 0
        self.m1 = None
        self.m2 = None
        self.m3 = None
        self.m4 = None
        self.left_encoder = None
        self.right_encoder = None

        if m1 is not None:
            self.m1 = m1
            # NOTE: Do NOT call m1.reverse() here!
            # In hardware, left motors face opposite direction and need reversing.
            # In the Gears simulator, outA/outB both go forward with positive speed.
            self.left.append(m1)
            self.left_encoder = m1

        if m3 is not None:
            self.m3 = m3
            # NOTE: Do NOT reverse - simulator handles direction
            self.left.append(m3)

        if m2 is not None:
            self.m2 = m2
            self.right.append(m2)
            self.right_encoder = m2

        if m4 is not None:
            self.m4 = m4
            self.right.append(m4)

        for m in self.left:
            self.left_motor_ports += m.port

        for m in self.right:
            self.right_motor_ports += m.port

        self._speed = 75
        self._min_speed = 40

        self._wheel_diameter = 80
        self._width = 300
        self._wheel_circ = math.pi * self._wheel_diameter
        self._ticks_per_rev = 0
        self._ticks_to_m = 0

        self._use_gyro = False

        self._mecanum_speed_factor = (
            (1, 1, 1, 1),
            (1, 0, 0, 1),
            (1, -1, 1, -1),
            (0, -1, -1, 0),
            (-1, -1, -1, -1),
            (-1, 0, 0, -1),
            (-1, 1, -1, 1),
            (0, 1, 1, 0),
            (-1.2, 1.2, 1.2, -1.2),
            (1.2, -1.2, -1.2, 1.2)
        )

        self._speed_ratio = (1, 1, 1, 1)

    def speed(self, speed=None, min_speed=None):
        if speed is None and min_speed is None:
            return self._speed
        if speed is not None:
            self._speed = speed
        if min_speed is not None:
            self._min_speed = min_speed
        elif speed is not None:
            self._min_speed = int(speed / 2)

    def size(self, wheel, width):
        self._wheel_diameter = wheel
        self._width = width
        self._wheel_circ = math.pi * self._wheel_diameter

        if self.left_encoder and self.right_encoder:
            self._ticks_per_rev = int((self.left_encoder.ticks_per_rev + self.right_encoder.ticks_per_rev) / 2)
            if self._ticks_per_rev > 0:
                self._ticks_to_m = (self._wheel_circ / self._ticks_per_rev) / 1000

    def use_gyro(self, enabled):
        self._use_gyro = enabled

    def pid(self, Kp=5, Ki=0.15, Kd=0):
        pass

    def speed_ratio(self, front_left=1, front_right=1, rear_left=1, rear_right=1):
        self._speed_ratio = (front_left, front_right, rear_left, rear_right)

    def line_sensor(self, sensor):
        pass

    def angle_sensor(self, sensor):
        pass

    # ====================== Driving functions ======================

    def forward(self):
        self.run(DIR_FW)

    def forward_for(self, amount, unit=SECOND, then=STOP):
        self.straight(self._speed, amount, unit, then)

    def backward(self):
        self.run(DIR_BW)

    def backward_for(self, amount, unit=SECOND, then=STOP):
        self.straight(-self._speed, amount, unit, then)

    def turn_left(self):
        self.run(DIR_L)

    def turn_left_for(self, amount, unit=SECOND, then=STOP):
        self.turn(-100, amount, unit, then)

    def turn_right(self):
        self.run(DIR_R)

    def turn_right_for(self, amount, unit=SECOND, then=STOP):
        self.turn(100, amount, unit, then)

    def move_left(self):
        if self._drive_mode != MODE_MECANUM:
            self.turn_left()
        else:
            self.run(DIR_SL)

    def move_left_for(self, amount, unit=SECOND, then=STOP):
        if self._drive_mode != MODE_MECANUM:
            self.turn_left_for(amount, unit, then)
        else:
            self.run(DIR_SL)
            if unit == SECOND:
                time.sleep(amount)
            self.stop_then(then)

    def move_right(self):
        if self._drive_mode != MODE_MECANUM:
            self.turn_right()
        else:
            self.run(DIR_SR)

    def move_right_for(self, amount, unit=SECOND, then=STOP):
        if self._drive_mode != MODE_MECANUM:
            self.turn_right_for(amount, unit, then)
        else:
            self.run(DIR_SR)
            if unit == SECOND:
                time.sleep(amount)
            self.stop_then(then)

    def straight(self, speed, amount, unit=SECOND, then=STOP):
        """Drive straight for a given distance/time."""
        amount = abs(amount)

        if unit == SECOND:
            self.run_speed(speed, speed)
            time.sleep(amount)
        elif unit == CM:
            self.run_speed(speed, speed)
            # Approximate time based on speed and distance
            # At 100% speed, assume ~30cm/sec
            est_time = amount / (abs(speed) / 100.0 * 30.0)
            time.sleep(est_time)
        else:
            self.run_speed(speed, speed)
            time.sleep(amount)

        self.stop_then(then)

    def turn(self, steering, amount=None, unit=SECOND, then=STOP):
        """Turn in place or along an arc."""
        if amount is None:
            left_speed, right_speed = self._calc_steering(self._speed, steering)
            self.run_speed(left_speed, right_speed)
            return

        amount = abs(amount)

        if unit == SECOND:
            left_speed, right_speed = self._calc_steering(self._speed, steering)
            self.run_speed(left_speed, right_speed)
            time.sleep(amount)
        elif unit == DEGREE:
            left_speed, right_speed = self._calc_steering(self._speed, steering)
            self.run_speed(left_speed, right_speed)
            # Approximate time based on degrees
            # At 100% speed, assume ~180 deg/sec for in-place turn
            est_time = amount / 180.0
            time.sleep(est_time)
        else:
            left_speed, right_speed = self._calc_steering(self._speed, steering)
            self.run_speed(left_speed, right_speed)
            time.sleep(amount)

        self.stop_then(then)

    def _calc_steering(self, speed, steering):
        """Calculate left and right speeds from steering value (-100 to 100)."""
        steering = max(min(100, steering), -100)
        if steering > 0:
            left_speed = speed
            right_speed = speed - (speed * steering * 2 / 100)
        elif steering < 0:
            right_speed = speed
            left_speed = speed + (speed * steering * 2 / 100)
        else:
            left_speed = speed
            right_speed = speed
        return (int(left_speed), int(right_speed))

    # ====================== Drive forever ======================

    def run(self, dir, speed=None):
        if speed is None:
            speed = self._speed
        else:
            speed = abs(max(min(100, speed), -100))

        if self._drive_mode == MODE_MECANUM:
            if self.m1:
                self.m1.run(speed * self._mecanum_speed_factor[dir][0] * self._speed_ratio[0])
            if self.m2:
                self.m2.run(speed * self._mecanum_speed_factor[dir][1] * self._speed_ratio[1])
            if self.m3:
                self.m3.run(speed * self._mecanum_speed_factor[dir][2] * self._speed_ratio[2])
            if self.m4:
                self.m4.run(speed * self._mecanum_speed_factor[dir][3] * self._speed_ratio[3])
        else:
            if dir == DIR_FW:
                self.run_speed(speed, speed)
            elif dir == DIR_BW:
                self.run_speed(-speed, -speed)
            elif dir == DIR_L:
                self.run_speed(-speed, speed)
            elif dir == DIR_R:
                self.run_speed(speed, -speed)
            elif dir == DIR_RF:
                self.run_speed(speed, int(speed / 2))
            elif dir == DIR_LF:
                self.run_speed(int(speed / 2), speed)
            elif dir == DIR_RB:
                self.run_speed(-speed, int(-speed / 2))
            elif dir == DIR_LB:
                self.run_speed(int(-speed / 2), -speed)
            else:
                self.stop()

    def run_speed(self, left_speed, right_speed=None):
        """Set speed for left and right motors simultaneously.
        
        Uses simPython.set_drive() to set both motors in a single JavaScript
        call, preventing any physics frames between the two motor commands.
        This is the same approach used by the keyboard/joystick controls.
        """
        if right_speed is None:
            right_speed = left_speed

        # Calculate output speed for left motor (with dead_band + reversal)
        l_speed = int(left_speed * self._speed_ratio[0])
        if self.left:
            l_speed = self.left[0]._calc_output_speed(l_speed)
        l_sp = int(l_speed * 10.5)  # Convert to simulator speed_sp range

        # Calculate output speed for right motor
        r_speed = int(right_speed * self._speed_ratio[1])
        if self.right:
            r_speed = self.right[0]._calc_output_speed(r_speed)
        r_sp = int(r_speed * 10.5)

        # Atomic: set both motors in one JS call
        simPython.set_drive(l_sp, r_sp)

    # ====================== Stop functions ======================

    def stop(self):
        # Atomic: stop both motors in one JS call
        simPython.stop_drive('coast')

    def brake(self):
        # Atomic: brake both motors in one JS call
        simPython.stop_drive('hold')

    def stop_then(self, then):
        if then == BRAKE:
            self.brake()
            time.sleep(0.1)
            self.stop()
        elif then == STOP:
            self.stop()
        elif then == BRAKE_NOW:
            self.brake()

    # ====================== Measuring ======================

    def distance(self):
        if self.left_encoder and self.right_encoder:
            left_angle = abs(self.left_encoder.angle())
            right_angle = abs(self.right_encoder.angle())
            angle = (left_angle + right_angle) / 2
            dist = (angle * self._wheel_circ) / 360
            return dist
        return 0

    def angle(self):
        return 0

    def reset_angle(self):
        for m in (self.left + self.right):
            m.reset_angle()
