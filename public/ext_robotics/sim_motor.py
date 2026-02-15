# Motor classes for Gears simulator
# This mirrors the ext_robotics motor.py API but uses the simulator driver
import time
from ext_robotics.sim_constants import *


class DCMotor:
    def __init__(self, driver, port, reversed=False):
        self.driver = driver
        self.port = port

        self._encoder_enabled = False
        self._rpm = 0
        self._ppr = 0
        self._gears = 0
        self.ticks_per_rev = 0
        self._max_pps = 0

        self._dead_band = 0
        self._stalled_speed = 0.05
        self._stalled_time = 1000

        if reversed:
            self._reversed = -1
        else:
            self._reversed = 1

        self.reset_angle()

    def reverse(self):
        if self._reversed == 1:
            self._reversed = -1
        else:
            self._reversed = 1

    def reverse_encoder(self):
        self.driver.reverse_encoder(self.port)

    def set_encoder(self, rpm, ppr, gears):
        if rpm <= 0 or ppr <= 0 or gears <= 0:
            raise Exception('Invalid encoder pulses config')

        self._encoder_enabled = True
        self._rpm = rpm
        self._ppr = ppr
        self._gears = gears
        self.ticks_per_rev = ppr * 4 * gears
        self._max_pps = rpm * ppr * 4 * gears / 60
        self.reset_angle()

    def stall_tolerances(self, speed, time_val):
        self._stalled_speed = speed
        self._stalled_time = time_val

    def set_dead_band(self, value):
        self._dead_band = value

    def _map_speed(self, speed, in_min=0, in_max=100, out_min=0, out_max=100):
        return int((speed - in_min) * (out_max - out_min) / (in_max - in_min) + out_min)

    def _calc_output_speed(self, speed):
        """Calculate the output speed value after dead_band mapping and reversal.
        
        Returns speed in -100..100 range, ready to be passed to driver.
        Used by DriveBase.run_speed() to calculate all motor speeds
        before sending them simultaneously.
        """
        speed = max(min(100, int(speed)), -100)
        temp = 1
        if speed < 0:
            temp = -1
            speed = abs(speed)
        speed = self._map_speed(speed, out_min=self._dead_band)
        if temp < 0:
            speed = speed * temp
        return speed * self._reversed

    def run(self, speed):
        speed = max(min(100, int(speed)), -100)
        temp = 1
        if speed < 0:
            temp = -1
            speed = abs(speed)
        speed = self._map_speed(speed, out_min=self._dead_band)
        if temp < 0:
            speed = speed * temp
        self.driver.set_motors(self.port, speed * self._reversed)

    def run_time(self, speed, time_ms, then=STOP):
        if time_ms <= 0:
            return

        start = time.time()
        self.run(speed)

        while True:
            elapsed = (time.time() - start) * 1000
            if elapsed >= time_ms:
                break
            time.sleep(0.01)

        if then == STOP:
            self.stop()
        elif then == BRAKE:
            self.brake()

    def run_angle(self, speed, angle, then=BRAKE):
        if not self._encoder_enabled:
            # Fallback: use time-based approximation
            time_ms = abs(angle) / 360.0 * 1000
            self.run_time(speed, time_ms, then)
            return

        target_ticks = int(angle * self.ticks_per_rev / 360)
        start_ticks = self.encoder_ticks()
        self.run(speed)

        while True:
            if abs(self.encoder_ticks() - start_ticks) >= target_ticks:
                break
            time.sleep(0.01)

        if then == STOP:
            self.stop()
        elif then == BRAKE:
            self.brake()

    def run_rotation(self, speed, rotation, then=BRAKE):
        target_angle = rotation * 360
        self.run_angle(speed, target_angle, then)

    def run_until_stalled(self, speed, then=STOP):
        # In simulator, just run for a short time
        self.run(speed)
        time.sleep(2)

        if then == STOP:
            self.stop()
        elif then == BRAKE:
            self.brake()

    def brake(self):
        self.driver.brake(self.port)

    def stop(self):
        self.driver.stop(self.port)

    def angle(self):
        if not self._encoder_enabled:
            return 0
        ticks = self.driver.get_encoder(self.port)
        rotations = (ticks * 360 * self._reversed) / self.ticks_per_rev
        return round(rotations, 1)

    def reset_angle(self):
        if not self._encoder_enabled:
            return
        self.driver.reset_encoder(self.port)

    def encoder_ticks(self):
        if not self._encoder_enabled:
            return 0
        return self.driver.get_encoder(self.port)

    def speed(self):
        if not self._encoder_enabled:
            return 0
        return round(self.driver.get_speed(self.port) * 60 / self.ticks_per_rev, 1)
