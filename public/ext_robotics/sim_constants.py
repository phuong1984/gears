# Constants for ext_robotics simulator mode
# These mirror the constants from constants.py but without micropython dependency

# motor ports
ALL = 63
M1 = 1
M2 = 2
M3 = 4
M4 = 8
E1 = 16
E2 = 32

STEPPER1 = 0
STEPPER2 = 1

DIR_CW = 1
DIR_CCW = -1

S1 = 0
S2 = 1
S3 = 2
S4 = 3

# drivetrain mode
MODE_2WD = 0
MODE_4WD = 1
MODE_MECANUM = 2

# stop method
STOP = 0
BRAKE = 1
BRAKE_NOW = 2

# move unit
SECOND = 0
DEGREE = 1
CM = 2
INCH = 3

# direction
DIR_FW = 0
DIR_RF = 1
DIR_R = 2
DIR_RB = 3
DIR_BW = 4
DIR_LB = 5
DIR_L = 6
DIR_LF = 7
DIR_SL = 8
DIR_SR = 9

# line sensor status
LINE_LEFT3 = -3
LINE_LEFT2 = -2
LINE_LEFT = -1
LINE_CENTER = 0
LINE_RIGHT = 1
LINE_RIGHT2 = 2
LINE_RIGHT3 = 3
LINE_CROSS = 4
LINE_END = 5
