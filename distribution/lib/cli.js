'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pIteration = require('p-iteration');

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

var _bundle = require('./bundle');

var _bundle2 = _interopRequireDefault(_bundle);

var _azure = require('./azure');

var _azure2 = _interopRequireDefault(_azure);

var _validation = require('./validation');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } // CLI setup

// Notify user of available updates
(0, _updateNotifier2.default)({ pkg: _package2.default }).notify();

// Configure CLI
_commander2.default.description(_package2.default.description).version(`v${_package2.default.version}`, '-v, --version').option('-s, --settings <paths>', 'path to settings file or comma-separated list of paths [settings.json]', 'settings.json').option('-w, --web-config <path>', 'path to custom web.config file').option('-d, --debug', 'enable debug mode').option('-q, --quiet', 'enable quite mode').parse(process.argv);

// Pretty print logs
_winston2.default.cli();

// Terminate on shelljs errors
_shelljs2.default.config.fatal = true;

// Toggle Quiet mode based on user preference
if (_commander2.default.quiet === true) {
  _winston2.default.level = 'error';
  _shelljs2.default.config.silent = true;
}

// Toggle Debug mode based on user preference
if (_commander2.default.debug === true) {
  _winston2.default.level = 'debug';
}

exports.default = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
    var _this = this;

    var settingsFilePaths, settingsFiles, azureMethodsInstances, bundleFile;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;

            // Validate Meteor
            (0, _validation.validateMeteor)(_commander2.default);

            // Validate settings file(s)
            settingsFilePaths = _commander2.default.settings.split(',');
            settingsFiles = settingsFilePaths.map(function (path) {
              return (0, _validation.validateSettings)(path);
            });

            // Configure Azure settings

            azureMethodsInstances = [];
            _context4.next = 7;
            return (0, _pIteration.forEach)(settingsFiles, function () {
              var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(settingsFile, index) {
                var azureMethods;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        azureMethods = new _azure2.default(settingsFile);

                        _winston2.default.info(`Validating Kudu connection (${settingsFilePaths[index]})`);
                        _context.next = 4;
                        return azureMethods.validateKuduCredentials();

                      case 4:
                        _context.next = 6;
                        return azureMethods.authenticateWithSdk();

                      case 6:
                        _context.next = 8;
                        return azureMethods.updateApplicationSettings();

                      case 8:
                        azureMethodsInstances.push(azureMethods);

                      case 9:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, _this);
              }));

              return function (_x, _x2) {
                return _ref2.apply(this, arguments);
              };
            }());

          case 7:

            // Deploy Meteor bundle
            bundleFile = (0, _bundle2.default)({ customWebConfig: _commander2.default.webConfig });
            _context4.next = 10;
            return (0, _pIteration.forEach)(azureMethodsInstances, function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(azureMethods) {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return azureMethods.deployBundle({ bundleFile });

                      case 2:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, _this);
              }));

              return function (_x3) {
                return _ref3.apply(this, arguments);
              };
            }());

          case 10:
            _context4.next = 12;
            return (0, _pIteration.forEach)(azureMethodsInstances, function () {
              var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(azureMethods) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.prev = 0;
                        _context3.next = 3;
                        return azureMethods.serverInitialisation({ isDebug: _commander2.default.debug });

                      case 3:
                        _context3.next = 8;
                        break;

                      case 5:
                        _context3.prev = 5;
                        _context3.t0 = _context3['catch'](0);

                        // Do not fail fast (allows more efficient redeploys)
                        _winston2.default.warn(_context3.t0.message);

                      case 8:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, _this, [[0, 5]]);
              }));

              return function (_x4) {
                return _ref4.apply(this, arguments);
              };
            }());

          case 12:
            _context4.next = 18;
            break;

          case 14:
            _context4.prev = 14;
            _context4.t0 = _context4['catch'](0);

            _winston2.default.error(_context4.t0.message);
            process.exit(1);

          case 18:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[0, 14]]);
  }));

  function startup() {
    return _ref.apply(this, arguments);
  }

  return startup;
}();