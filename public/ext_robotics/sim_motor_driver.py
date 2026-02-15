# Motor driver emulation for Gears simulator
# This replaces mdv2.py hardware calls with simPython calls
import simPython, time
from ext_robotics.sim_constants import *

# Needed to prevent loops from locking up the javascript thread
SENSOR_DELAY = 0.001

# Map ext_robotics motor ports to Gears simulator motor ports
PORT_MAP = {
    E1: 'outA',   # Encoder 1 -> left wheel
    E2: 'outB',   # Encoder 2 -> right wheel
    M1: 'outC',   # Motor 1
    M2: 'outD',   # Motor 2
    M3: 'outE',   # Motor 3
    M4: 'outF',   # Motor 4
}

class SimMotorDriver:
    """Simulated motor driver that maps ext_robotics API to Gears simulator."""

    def __init__(self):
        self._motors = {}
        self._reversed_encoders = {}

    def _get_sim_motor(self, port):
        """Get or create a simPython Motor for the given port."""
        if port not in self._motors:
            address = PORT_MAP.get(port, 'outA')
            self._motors[port] = simPython.Motor(address)
            self._reversed_encoders[port] = False
            # Reset the motor to a clean state (matching ev3dev2 behavior)
            self._motors[port].speed_sp(0)
            self._motors[port].stop_action('hold')
            self._motors[port].command('stop')
        return self._motors[port]

    def set_motors(self, motors, speed):
        """Set motor speed for a single port. Speed is -100 to 100."""
        speed = max(min(100, int(speed)), -100)
        # Map speed from -100..100 to the simulator's -1050..1050 range
        # (ev3dev2 uses SpeedPercent: 100% = 1050 speed_sp)
        speed_sp = int(speed * 10.5)

        for port_bit in [M1, M2, M3, M4, E1, E2]:
            if motors & port_bit:
                motor = self._get_sim_motor(port_bit)
                motor.speed_sp(speed_sp)
                if speed_sp == 0:
                    motor.command('stop')
                else:
                    motor.command('run-forever')

    def run_motors_together(self, motor_speeds):
        """Set speeds for multiple motors simultaneously.
        
        First sets speed_sp for ALL motors, THEN issues run-forever.
        This prevents one motor from starting before the other,
        which would cause a brief unwanted rotation.
        
        Args:
            motor_speeds: list of (port, speed_100) tuples
                         speed_100 is -100 to 100
        """
        # Phase 1: Set speed_sp for all motors
        commands = []
        for port, speed in motor_speeds:
            speed = max(min(100, int(speed)), -100)
            speed_sp = int(speed * 10.5)
            motor = self._get_sim_motor(port)
            motor.speed_sp(speed_sp)
            commands.append((motor, speed_sp))

        # Phase 2: Issue run commands for all motors
        for motor, speed_sp in commands:
            if speed_sp == 0:
                motor.command('stop')
            else:
                motor.command('run-forever')

    def stop(self, motors=ALL):
        """Stop motors (coast)."""
        for port_bit in [M1, M2, M3, M4, E1, E2]:
            if motors & port_bit:
                motor = self._get_sim_motor(port_bit)
                motor.stop_action('coast')
                motor.command('stop')

    def brake(self, motors=ALL):
        """Brake motors (hold)."""
        for port_bit in [M1, M2, M3, M4, E1, E2]:
            if motors & port_bit:
                motor = self._get_sim_motor(port_bit)
                motor.stop_action('hold')
                motor.command('stop')

    def get_encoder(self, motors=ALL):
        """Get encoder position."""
        time.sleep(SENSOR_DELAY)
        if motors == ALL:
            e1 = self._get_encoder_single(E1)
            e2 = self._get_encoder_single(E2)
            return [e1, e2]
        else:
            return self._get_encoder_single(motors)

    def _get_encoder_single(self, port):
        """Get encoder position for a single motor."""
        motor = self._get_sim_motor(port)
        pos = int(motor.position())
        if self._reversed_encoders.get(port, False):
            pos = -pos
        return pos

    def reset_encoder(self, motors=ALL):
        """Reset encoder position."""
        for port_bit in [E1, E2]:
            if motors & port_bit:
                motor = self._get_sim_motor(port_bit)
                motor.position(0)

    def reverse_encoder(self, motors):
        """Reverse encoder direction."""
        for port_bit in [E1, E2]:
            if motors & port_bit:
                self._reversed_encoders[port_bit] = not self._reversed_encoders.get(port_bit, False)

    def get_speed(self, motor=ALL):
        """Get motor speed."""
        time.sleep(SENSOR_DELAY)
        if motor == ALL:
            s1 = self._get_speed_single(E1)
            s2 = self._get_speed_single(E2)
            return [s1, s2]
        else:
            return self._get_speed_single(motor)

    def _get_speed_single(self, port):
        """Get speed for a single motor."""
        motor_obj = self._get_sim_motor(port)
        return int(motor_obj.speed())

    def battery(self):
        """Get battery voltage (simulated)."""
        return 12.0

    def fw_version(self):
        """Get firmware version (simulated)."""
        return "1.0"

    def set_servo(self, index, angle, max=180):
        """Set servo angle (stubbed for simulator)."""
        pass
