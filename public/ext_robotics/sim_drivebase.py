# DriveBase for Gears simulator
# This mirrors the ext_robotics drivebase.py API but works in the simulator
import time, math, simPython
from ext_robotics.sim_constants import *

LONG_DISTANCE_CM = 29
LONG_DISTANCE_SECOND = 0.49
LONG_DISTANCE_DEGREE = 29
# Adjust for simulator physics
TARGET_PERCENT = 1.0


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
        
        self._last_l = None
        self._last_r = None

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

        self._speed = 50
        self._min_speed = 3     # Extremely slow for precision crawling

        self._wheel_diameter = 56
        self._width = 160
        self._wheel_circ = math.pi * self._wheel_diameter
        self._ticks_per_rev = 360 # Default for simulator
        self._ticks_to_m = (self._wheel_circ / 360) / 1000

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
        self._distance_accel = 0.0
        self._counter_brake = 0

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

    def _calc_distance_accel_decel(self, unit, amount=None):
        if unit == CM:
            self._distance_accel = self._ticks_per_rev / 3  # ~120 ticks
        elif unit == SECOND:
            self._distance_accel = 300  # ms
        elif unit == DEGREE:
            self._distance_accel = 30  # degrees or equivalent

    def _calc_speed(self, driven, total_dist):
        calculated_speed = self._speed
        driven_distance = abs(driven)

        # Accel phase
        if driven_distance < self._distance_accel:
            calculated_speed = int(self._min_speed + (self._speed - self._min_speed) * driven_distance / self._distance_accel)
        
        # Linear Decel phase
        remaining = total_dist - driven_distance
        
        # Crawl zone: Force min speed at the very end to prevent overshoot
        if remaining < 15: # 15 ticks or degrees
            return self._min_speed

        decel_threshold = max(total_dist * 0.5, 60)
        
        if remaining < decel_threshold:
            # Scale down to min_speed
            ratio = remaining / decel_threshold
            calculated_speed = int(self._min_speed + (calculated_speed - self._min_speed) * ratio)
            
        return max(self._min_speed, calculated_speed)

    def _calib_speed(self, speed):
        # Placeholder for PID straight correction if needed later
        return (speed, speed)

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
        self.move_slide(amount, unit, then, DIR_SL)

    def move_right(self):
        if self._drive_mode != MODE_MECANUM:
            self.turn_right()
        else:
            self.run(DIR_SR)

    def move_right_for(self, amount, unit=SECOND, then=STOP):
        self.move_slide(amount, unit, then, DIR_SR)

    def move_slide(self, amount, unit=SECOND, then=STOP, dir_slide=DIR_SL):
        if self._drive_mode != MODE_MECANUM:
            if dir_slide == DIR_SL:
                self.turn_left_for(amount, unit, then)
            else:
                self.turn_right_for(amount, unit, then)
            return

        amount = abs(amount)
        self._counter_brake = 0

        if unit == SECOND:
            distance = amount * 1000
            self._calc_distance_accel_decel(unit)
            
            time_start = time.time() * 1000
            while True:
                driven = (time.time() * 1000) - time_start
                if driven >= distance:
                    break
                
                speed = self._calc_speed(driven, distance)
                self.run(dir_slide, speed)
                time.sleep(0.001)
        else: # CM
            distance = amount * 10 # to mm
            target_ticks = (distance / self._wheel_circ) * 1.414 * self._ticks_per_rev
            self._calc_distance_accel_decel(unit)

            m_l = self.left[0] if self.left else None
            m_r = self.right[0] if self.right else None
            start_l = m_l.driver.get_encoder(m_l.port) if m_l else 0
            start_r = m_r.driver.get_encoder(m_r.port) if m_r else 0

            while True:
                dl = abs(m_l.driver.get_encoder(m_l.port) - start_l) if m_l else 0
                dr = abs(m_r.driver.get_encoder(m_r.port) - start_r) if m_r else 0
                driven = int((dl + dr) / 2)

                if driven >= target_ticks:
                    break
                
                speed = self._calc_speed(driven, target_ticks)
                
                # Final precision pulse: if very close, force a split second brake
                if (target_ticks - driven) < 15:
                    self.brake()
                    time.sleep(0.001)
                    speed = self._min_speed

                self.run(dir_slide, speed)
                time.sleep(0.001)
        
        self.stop_then(then)

    def straight(self, speed, amount, unit=SECOND, then=STOP):
        """Drive straight optimized for simulator handles and sensors."""
        amount = abs(amount)
        speed_dir = speed / abs(speed) if speed != 0 else 1
        
        if unit == SECOND:
            distance = amount * 1000
            self._calc_distance_accel_decel(unit)
            
            time_start = time.time() * 1000
            while True:
                driven = (time.time() * 1000) - time_start
                if driven >= distance: break
                
                speed = self._calc_speed(driven, distance)
                l_sp, r_sp = self._calib_speed(speed * speed_dir)
                self.run_speed(l_sp, r_sp)
                time.sleep(0.001)
        
        elif unit == CM:
            distance_mm = amount * 10
            target_ticks = (distance_mm / self._wheel_circ) * self._ticks_per_rev
            self._calc_distance_accel_decel(unit)
            
            m_l = self.left[0] if self.left else None
            m_r = self.right[0] if self.right else None
            start_l = m_l.driver.get_encoder(m_l.port) if m_l else 0
            start_r = m_r.driver.get_encoder(m_r.port) if m_r else 0
            
            while True:
                dl = abs(m_l.driver.get_encoder(m_l.port) - start_l) if m_l else 0
                dr = abs(m_r.driver.get_encoder(m_r.port) - start_r) if m_r else 0
                driven = (dl + dr) / 2
                
                if driven >= target_ticks: break
                
                speed = self._calc_speed(driven, target_ticks)
                
                # Final precision pulse
                if (target_ticks - driven) < 15:
                    self.brake()
                    time.sleep(0.001)
                    speed = self._min_speed

                l_sp, r_sp = self._calib_speed(speed * speed_dir)
                self.run_speed(l_sp, r_sp)
                time.sleep(0.001)
        
        self.stop_then(then)

    def _find_gyro(self):
        """Try to find a GyroSensor on standard input ports."""
        if not hasattr(self, '_gyro_sensor') or self._gyro_sensor is None:
            for port in ('in1', 'in2', 'in3', 'in4'):
                try:
                    self._gyro_sensor = simPython.GyroSensor(port)
                    break
                except:
                    pass
            else:
                self._gyro_sensor = None
        return self._gyro_sensor

    def turn(self, steering, amount=None, unit=SECOND, then=STOP):
        """Turn the robot with simulator-optimized logic."""
        if amount is None:
            left_speed, right_speed = self._calc_steering(self._speed, steering)
            self.run_speed(left_speed, right_speed)
            return

        amount = abs(amount)
        if unit == DEGREE:
            gyro = self._find_gyro() if self._use_gyro else None

            if gyro:
                res = gyro.yawAngleAndRate(True)
                start_angle = res[0] if isinstance(res, (list, tuple)) else res
                target_angle = amount
                self._calc_distance_accel_decel(unit)
                
                while True:
                    res = gyro.yawAngleAndRate(True)
                    curr_val = res[0] if isinstance(res, (list, tuple)) else res
                    
                    # Correct angle delta with 360 wrap-around
                    diff = curr_val - start_angle
                    while diff > 180: diff -= 360
                    while diff < -180: diff += 360
                    driven = abs(diff)
                    
                    if driven >= target_angle: break
                    
                    speed = self._calc_speed(driven, target_angle)
                    l_sp, r_sp = self._calc_steering(speed, steering)
                    self.run_speed(l_sp, r_sp)
                    time.sleep(0.001)
            else:
                m_l = self.left[0] if self.left else None
                m_r = self.right[0] if self.right else None
                start_l = m_l.driver.get_encoder(m_l.port) if m_l else 0
                start_r = m_r.driver.get_encoder(m_r.port) if m_r else 0
                wheel_circ_degree = self._wheel_circ / 360
                
                # Formula adjustment: Pivot (100) vs Swing (50) turn
                scale = 2.0 - (abs(steering) / 100.0)
                target_dist_ticks = (math.pi * self._width * scale * (amount/360) / self._wheel_circ) * self._ticks_per_rev
                
                self._calc_distance_accel_decel(unit)
                
                while True:
                    dl = abs(m_l.driver.get_encoder(m_l.port) - start_l) if m_l else 0
                    dr = abs(m_r.driver.get_encoder(m_r.port) - start_r) if m_r else 0
                    driven_ticks = max(dl, dr)
                    
                    if driven_ticks >= target_dist_ticks: break
                    
                    speed = self._calc_speed(driven_ticks, target_dist_ticks)
                    l_sp, r_sp = self._calc_steering(speed, steering)
                    self.run_speed(l_sp, r_sp)
                    time.sleep(0.001)

        elif unit == SECOND:
            time_start = time.time() * 1000
            target_ms = amount * 1000
            self._calc_distance_accel_decel(unit)
            
            while True:
                driven = (time.time() * 1000) - time_start
                if driven >= target_ms: break
                
                speed = self._calc_speed(driven, target_ms)
                l_sp, r_sp = self._calc_steering(speed, steering)
                self.run_speed(l_sp, r_sp)
                time.sleep(0.001)

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
        if right_speed is None:
            right_speed = left_speed

        l_speed = int(left_speed * self._speed_ratio[0])
        if self.left:
            l_speed = self.left[0]._calc_output_speed(l_speed)
        l_sp = int(l_speed * 10.5)

        r_speed = int(right_speed * self._speed_ratio[1])
        if self.right:
            r_speed = self.right[0]._calc_output_speed(r_speed)
        r_sp = int(r_speed * 10.5)

        # CRITICAL: Prevent resetting the simulator's drive ramp intervals
        if self._last_l == l_sp and self._last_r == r_sp:
            return

        simPython.set_drive(l_sp, r_sp)
        self._last_l = l_sp
        self._last_r = r_sp

    # ====================== Stop functions ======================

    def stop(self):
        self._last_l = None
        self._last_r = None
        simPython.stop_drive('coast')

    def brake(self):
        self._last_l = None
        self._last_r = None
        simPython.stop_drive('hold')

    def stop_then(self, then):
        if then == BRAKE:
            self.brake()
            time.sleep(0.001)
            self.stop()
        elif then == STOP:
            self.stop()
        elif then == BRAKE_NOW:
            self.brake()
            time.sleep(0.001)

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
        gyro = self._find_gyro()
        if gyro:
            gyro.reset()
        for m in (self.left + self.right):
            m.reset_angle()
