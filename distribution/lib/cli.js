'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

var _updateNotifier = require('update-notifier');

var _updateNotifier2 = _interopRequireDefault(_updateNotifier);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _package = require('../../package.json');

var _package2 = _interopRequireDefault(_package);

var _validation = require('./validation');

var _bundle = require('./bundle');

var _bundle2 = _interopRequireDefault(_bundle);

var _azure = require('./azure');

var _azure2 = _interopRequireDefault(_azure);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } // CLI setup

(0, _updateNotifier2.default)({ pkg: _package2.default }).notify();

_commander2.default.description(_package2.default.description).version(`v${_package2.default.version}`, '-v, --version').option('-s, --settings <path>', 'path to settings file [settings.json]', 'settings.json').option('-w, --web-config <path>', 'path to custom web.config file').option('-d, --debug', 'enable debug mode').option('-q, --quiet', 'enable quite mode').parse(process.argv);

// Pretty print logs
_winston2.default.cli();

// Terminate on shell error
_shelljs2.default.config.fatal = true;

// Quiet mode
if (_commander2.default.quiet === true) {
  _winston2.default.level = 'error';
  _shelljs2.default.config.silent = true;
}

// Debug mode
if (_commander2.default.debug === true) {
  _winston2.default.level = 'debug';
}

exports.default = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var settingsFile, azureMethods;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;

            (0, _validation.validateMeteor)();
            settingsFile = (0, _validation.validateSettings)(_commander2.default.settings);
            azureMethods = new _azure2.default(settingsFile);
            _context.next = 6;
            return azureMethods.validateKuduCredentials();

          case 6:
            _context.next = 8;
            return azureMethods.authenticateSdk();

          case 8:
            _context.next = 10;
            return azureMethods.updateApplicationSettings();

          case 10:
            _context.next = 12;
            return azureMethods.deployBundle({
              bundleFile: (0, _bundle2.default)({ customWebConfig: _commander2.default.webConfig }),
              isDebug: _commander2.default.debug
            });

          case 12:
            _context.next = 18;
            break;

          case 14:
            _context.prev = 14;
            _context.t0 = _context['catch'](0);

            _winston2.default.error(_context.t0.message);
            process.exit(1);

          case 18:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 14]]);
  }));

  function startup() {
    return _ref.apply(this, arguments);
  }

  return startup;
}();