var skulpt = new function () {
  var self = this;

  this.externalLibs = {
    './ev3dev2/__init__.py': false,
    './ev3dev2/motor.py': 'ev3dev2/motor.py?v=8a7d9967',
    './ev3dev2/sound.py': 'ev3dev2/sound.py?v=a54e0bb7',
    './ev3dev2/button.py': 'ev3dev2/button.py?v=5323928b',
    './ev3dev2/sensor/__init__.py': 'ev3dev2/sensor/__init__.py?v=c01f00db',
    './ev3dev2/sensor/lego.py': 'ev3dev2/sensor/lego.py?v=4cbc6b8b',
    './ev3dev2/sensor/virtual.py': 'ev3dev2/sensor/virtual.py?v=36db9ebf',
    './simPython.js': 'js/simPython.js?v=163d13a3',
    './pybricks/__init__.py': false,
    './pybricks/parameters.py': 'pybricks/parameters.py?v=eb349cab',
    './pybricks/tools.py': 'pybricks/tools.py?v=a41c5df7',
    './pybricks/hubs.py': 'pybricks/hubs.py?v=9bfa3598',
    './pybricks/ev3devices.py': 'pybricks/ev3devices.py?v=0ae43604',
    './pybricks/robotics.py': 'pybricks/robotics.py?v=1e16263a',
    './ev3dev2/Training_Wheels.py': 'ev3dev2/Training_Wheels.py?v=24b9b81a',
    './ext_robotics/__init__.py': 'ext_robotics/__init__.py?v=1bb63e76',
    './ext_robotics/sim_constants.py': 'ext_robotics/sim_constants.py?v=03e2e88d',
    './ext_robotics/sim_motor_driver.py': 'ext_robotics/sim_motor_driver.py?v=7b2f360a',
    './ext_robotics/sim_motor.py': 'ext_robotics/sim_motor.py?v=5627a42c',
    './ext_robotics/sim_drivebase.py': 'ext_robotics/sim_drivebase.py?v=563cf9f3',
  };
  this.preloadedLibs = {};

  // Run on page load
  this.init = function () {
    Sk.configure({
      output: self.outf,
      read: self.builtinRead,
      __future__: Sk.python3
    });
    Sk.execLimit = 5000;

    self.preload();
  };

  // Run program
  this.runPython = function (prog) {
    if (typeof self.hardInterrupt != 'undefined') {
      delete self.hardInterrupt;
    }
    if (self.running == true) {
      return;
    }
    self.running = true;

    var myPromise = Sk.misceval.asyncToPromise(
      function () {
        return Sk.importMainWithBody("<stdin>", false, prog, true);
      },
      {
        '*': self.interruptHandler
      }
    );
    var resetExecStart = setInterval(function () { Sk.execStart = Date(); }, 2000);
    myPromise.then(
      function (mod) {
        self.running = false;
        clearInterval(resetExecStart);
        simPanel.setRunIcon('run');
      },
      function (err) {
        self.running = false;
        if (err instanceof Sk.builtin.ExternalError) {
          console.log(err.toString());
        } else {
          simPanel.consoleWriteErrors(err.toString());
        }
        clearInterval(resetExecStart);
        simPanel.setRunIcon('run');
      }
    );
  };

  // InterruptHandler
  this.interruptHandler = function (susp) {
    if (self.hardInterrupt === true) {
      delete self.hardInterrupt;
      throw new Sk.builtin.ExternalError('aborted execution');
    } else {
      return null;
    }
  };

  // Write to stdout
  this.outf = function (text) {
    simPanel.consoleWrite(text);
  };

  // Files preloader
  this.preload = function () {
    function fetchPreload(key, url) {
      fetch(url)
        .then(function (r) {
          return r.text();
        })
        .then(function (r) {
          self.preloadedLibs[key] = r;
        });
    }

    for (key in self.externalLibs) {
      if (self.externalLibs[key] === false) {
        self.preloadedLibs[key] = '';
      } else {
        fetchPreload(key, self.externalLibs[key]);
      }
    }
  };

  // File loader
  this.builtinRead = function (filename) {
    let searchModule = filename;
    if (searchModule.startsWith('./')) {
      searchModule = searchModule.substring(2);
    }
    if (filesManager.files[searchModule] !== undefined) {
      return filesManager.files[searchModule];
    }

    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][filename] === undefined) {
      if (filename in self.preloadedLibs) {
        return self.preloadedLibs[filename];
      } else if (filename in self.externalLibs) {
        return Sk.misceval.promiseToSuspension(
          fetch(externalLibs[filename])
            .then(r => r.text())
        );
      } else {
        throw "File not found: '" + filename + "'";
      }
    }
    return Sk.builtinFiles["files"][filename];
  };
}

// Init class
skulpt.init();
