"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.array.map");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.split");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = startup;

require("regenerator-runtime/runtime");

var _pIteration = require("p-iteration");

var _commander = _interopRequireDefault(require("commander"));

var _shelljs = _interopRequireDefault(require("shelljs"));

var _updateNotifier = _interopRequireDefault(require("update-notifier"));

var _winston = _interopRequireDefault(require("winston"));

var _package = _interopRequireDefault(require("../../package.json"));

var _bundle = _interopRequireDefault(require("./bundle"));

var _azure = _interopRequireDefault(require("./azure"));

var _validation = require("./validation");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// Notify user of available updates
(0, _updateNotifier.default)({
  pkg: _package.default
}).notify(); // Configure CLI

_commander.default.description(_package.default.description).version(`v${_package.default.version}`, '-v, --version').option('-s, --settings <paths>', 'path to settings file or comma-separated list of paths [settings.json]', 'settings.json').option('-w, --web-config <path>', 'path to custom web.config file').option('-a, --architecture <32|64>', 'target node architecture [32]', '32').option('-d, --debug', 'enable debug mode').option('-q, --quiet', 'enable quite mode').parse(process.argv); // Pretty print logs


_winston.default.cli(); // Terminate on shelljs errors


_shelljs.default.config.fatal = true; // Toggle Quiet mode based on user preference

if (_commander.default.quiet === true) {
  _winston.default.level = 'error';
  _shelljs.default.config.silent = true;
} // Toggle Debug mode based on user preference


if (_commander.default.debug === true) {
  _winston.default.level = 'debug';
}

function startup() {
  return _startup.apply(this, arguments);
}

function _startup() {
  _startup = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4() {
    var settingsFilePaths, settingsFiles, azureMethodsInstances, bundleFile;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;

            if (!(_commander.default.architecture !== '32' && _commander.default.architecture !== '64')) {
              _context4.next = 3;
              break;
            }

            throw new Error('Invalid architecture specified - must be \'32\' or \'64\'');

          case 3:
            _winston.default.info(`Targetting ${_commander.default.architecture}-bit Node architecture`); // Validate Meteor version/packages


            (0, _validation.validateMeteor)(_commander.default.architecture); // Validate settings file(s)

            settingsFilePaths = _commander.default.settings.split(',');
            settingsFiles = settingsFilePaths.map(function (path) {
              return (0, _validation.validateSettings)(path);
            }); // Configure Azure settings

            azureMethodsInstances = [];
            _context4.next = 10;
            return (0, _pIteration.forEach)(settingsFiles,
            /*#__PURE__*/
            function () {
              var _ref = _asyncToGenerator(
              /*#__PURE__*/
              regeneratorRuntime.mark(function _callee(settingsFile, index) {
                var azureMethods;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        azureMethods = new _azure.default(settingsFile);

                        _winston.default.info(`Validating Kudu connection (${settingsFilePaths[index]})`);

                        _context.next = 4;
                        return azureMethods.validateKuduCredentials();

                      case 4:
                        _context.next = 6;
                        return azureMethods.authenticateWithSdk();

                      case 6:
                        _context.next = 8;
                        return azureMethods.updateApplicationSettings(_commander.default.architecture);

                      case 8:
                        azureMethodsInstances.push(azureMethods);

                      case 9:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x, _x2) {
                return _ref.apply(this, arguments);
              };
            }());

          case 10:
            // Deploy Meteor bundle
            bundleFile = (0, _bundle.default)({
              customWebConfig: _commander.default.webConfig,
              architecture: _commander.default.architecture
            });
            _context4.next = 13;
            return (0, _pIteration.forEach)(azureMethodsInstances,
            /*#__PURE__*/
            function () {
              var _ref2 = _asyncToGenerator(
              /*#__PURE__*/
              regeneratorRuntime.mark(function _callee2(azureMethods) {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return azureMethods.deployBundle({
                          bundleFile
                        });

                      case 2:
                      case "end":
                        return _context2.stop();
                    }
                  }
                }, _callee2);
              }));

              return function (_x3) {
                return _ref2.apply(this, arguments);
              };
            }());

          case 13:
            _context4.next = 15;
            return (0, _pIteration.forEach)(azureMethodsInstances,
            /*#__PURE__*/
            function () {
              var _ref3 = _asyncToGenerator(
              /*#__PURE__*/
              regeneratorRuntime.mark(function _callee3(azureMethods) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.prev = 0;
                        _context3.next = 3;
                        return azureMethods.serverInitialisation({
                          isDebug: _commander.default.debug
                        });

                      case 3:
                        _context3.next = 8;
                        break;

                      case 5:
                        _context3.prev = 5;
                        _context3.t0 = _context3["catch"](0);

                        // Do not fail fast (allows more efficient redeploys)
                        _winston.default.warn(_context3.t0.message);

                      case 8:
                      case "end":
                        return _context3.stop();
                    }
                  }
                }, _callee3, null, [[0, 5]]);
              }));

              return function (_x4) {
                return _ref3.apply(this, arguments);
              };
            }());

          case 15:
            _context4.next = 21;
            break;

          case 17:
            _context4.prev = 17;
            _context4.t0 = _context4["catch"](0);

            _winston.default.error(_context4.t0.message);

            process.exit(1);

          case 21:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, null, [[0, 17]]);
  }));
  return _startup.apply(this, arguments);
}