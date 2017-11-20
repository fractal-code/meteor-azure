'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Azure methods

var _azureArmWebsite = require('azure-arm-website');

var _azureArmWebsite2 = _interopRequireDefault(_azureArmWebsite);

var _msRestAzure = require('ms-rest-azure');

var _msRestAzure2 = _interopRequireDefault(_msRestAzure);

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

var _jsesc = require('jsesc');

var _jsesc2 = _interopRequireDefault(_jsesc);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AzureMethods = function () {
  function AzureMethods(settingsFile) {
    _classCallCheck(this, AzureMethods);

    this.meteorSettings = (0, _lodash2.default)(settingsFile, 'meteor-azure');
    this.settings = settingsFile['meteor-azure'];
    this.isSlot = this.settings.slotName !== undefined;

    // Determine Kudu site name
    var kuduName = this.settings.siteName;
    if (this.isSlot) {
      kuduName = `${kuduName}-${this.settings.slotName}`;
    }

    // Configure Kudu API connection
    this.kuduClient = _axios2.default.create({
      baseURL: `https://${kuduName}.scm.azurewebsites.net`,
      auth: this.settings.deploymentCreds
    });
  }

  _createClass(AzureMethods, [{
    key: 'authenticate',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var _settings, servicePrincipal, tenantId, subscriptionId, credentials, appId, secret;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _settings = this.settings, servicePrincipal = _settings.servicePrincipal, tenantId = _settings.tenantId, subscriptionId = _settings.subscriptionId;
                credentials = void 0;

                if (!(servicePrincipal !== undefined)) {
                  _context.next = 10;
                  break;
                }

                appId = servicePrincipal.appId, secret = servicePrincipal.secret;

                _winston2.default.info('Authenticating with service principal');
                _context.next = 7;
                return _msRestAzure2.default.loginWithServicePrincipalSecret(appId, secret, tenantId);

              case 7:
                credentials = _context.sent;
                _context.next = 14;
                break;

              case 10:
                _winston2.default.info('Authenticating with interactive login...');
                _context.next = 13;
                return _msRestAzure2.default.interactiveLogin({ domain: tenantId });

              case 13:
                credentials = _context.sent;

              case 14:

                _winston2.default.debug('completed Azure authentication');
                this.azureSdk = new _azureArmWebsite2.default(credentials, subscriptionId).webApps;

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function authenticate() {
        return _ref.apply(this, arguments);
      }

      return authenticate;
    }()
  }, {
    key: 'updateApplicationSettings',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var newSettings, _settings2, resourceGroup, siteName, slotName, envVariables, nodeVersion, npmVersion;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                newSettings = void 0;
                _settings2 = this.settings, resourceGroup = _settings2.resourceGroup, siteName = _settings2.siteName, slotName = _settings2.slotName, envVariables = _settings2.envVariables;


                _winston2.default.info('Updating Azure application settings');

                // Start with current settings

                if (!this.isSlot) {
                  _context2.next = 9;
                  break;
                }

                _context2.next = 6;
                return this.azureSdk.listApplicationSettingsSlot(resourceGroup, siteName, slotName);

              case 6:
                newSettings = _context2.sent;
                _context2.next = 12;
                break;

              case 9:
                _context2.next = 11;
                return this.azureSdk.listApplicationSettings(resourceGroup, siteName);

              case 11:
                newSettings = _context2.sent;

              case 12:

                // Set environment variables
                _winston2.default.debug('set environment variables');
                Object.assign(newSettings.properties, envVariables);

                // Set Meteor settings
                _winston2.default.debug('set Meteor settings');
                Object.assign(newSettings.properties, {
                  METEOR_SETTINGS: this.meteorSettings,
                  METEOR_SKIP_NPM_REBUILD: 1
                });

                // Set Kudu deployment settings
                _winston2.default.debug('set Kudu deployment settings');
                Object.assign(newSettings.properties, {
                  METEOR_AZURE_TIMESTAMP: Date.now(), // abort incomplete deploy
                  SCM_COMMAND_IDLE_TIMEOUT: 3600,
                  SCM_TOUCH_WEBCONFIG_AFTER_DEPLOYMENT: 0
                });

                // Set Node/NPM versions (based on current Meteor)
                nodeVersion = _shelljs2.default.exec('meteor node -v', { silent: true }).stdout.trim();
                npmVersion = _shelljs2.default.exec('meteor npm -v', { silent: true }).stdout.trim();

                _winston2.default.debug(`set Node to ${nodeVersion}`);
                _winston2.default.debug(`set NPM to v${npmVersion}`);
                Object.assign(newSettings.properties, {
                  METEOR_AZURE_NODE_VERSION: nodeVersion,
                  METEOR_AZURE_NPM_VERSION: npmVersion
                });

                // Serialise values
                Object.keys(newSettings.properties).forEach(function (key) {
                  newSettings.properties[key] = (0, _jsesc2.default)(newSettings.properties[key], {
                    json: true,
                    wrap: false
                  });
                });

                // Push new settings

                if (!this.isSlot) {
                  _context2.next = 29;
                  break;
                }

                _context2.next = 27;
                return this.azureSdk.updateApplicationSettingsSlot(resourceGroup, siteName, newSettings, slotName);

              case 27:
                _context2.next = 31;
                break;

              case 29:
                _context2.next = 31;
                return this.azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);

              case 31:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function updateApplicationSettings() {
        return _ref2.apply(this, arguments);
      }

      return updateApplicationSettings;
    }()
  }, {
    key: 'deployBundle',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(_ref3) {
        var bundleFile = _ref3.bundleFile,
            isDebug = _ref3.isDebug;
        var kuduDeploy, delay, progress, kuduLogs, logDetailsUrl, logDetails;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                // Upload bundle tarball
                _winston2.default.info('Deploying bundle tarball');
                _context3.next = 3;
                return this.kuduClient({
                  method: 'put',
                  url: '/vfs/meteor-azure/bundle.tar.gz',
                  headers: { 'If-Match': '*' },
                  data: _fs2.default.createReadStream(bundleFile)
                });

              case 3:
                _context3.next = 5;
                return this.kuduClient({
                  method: 'post',
                  url: '/deploy?isAsync=true',
                  data: {
                    format: 'basic',
                    url: 'https://github.com/fractal-code/meteor-azure-server-init.git'
                  }
                });

              case 5:
                kuduDeploy = _context3.sent;


                _winston2.default.info('Running server initialisation, polling for status...');

                // Poll server for deploy status

                delay = function delay(ms) {
                  return new Promise(function (resolve) {
                    return setTimeout(resolve, ms);
                  });
                };

                progress = void 0;

              case 9:
                _context3.next = 11;
                return delay(20000);

              case 11:
                _context3.prev = 11;
                _context3.next = 14;
                return this.kuduClient.get(kuduDeploy.headers.location);

              case 14:
                progress = _context3.sent;
                _context3.next = 21;
                break;

              case 17:
                _context3.prev = 17;
                _context3.t0 = _context3['catch'](11);

                _winston2.default.error(_context3.t0.message);
                throw new Error('Could not poll server status');

              case 21:
                if (progress.data.complete === false) {
                  _context3.next = 9;
                  break;
                }

              case 22:
                if (!(isDebug === true)) {
                  _context3.next = 39;
                  break;
                }

                _winston2.default.debug('Retrieving Kudu deployment log...');
                _context3.prev = 24;
                _context3.next = 27;
                return this.kuduClient(`/deployments/${progress.data.id}/log`);

              case 27:
                kuduLogs = _context3.sent;
                logDetailsUrl = kuduLogs.data.find(function (log) {
                  return log.details_url !== null;
                }).details_url;
                _context3.next = 31;
                return this.kuduClient(logDetailsUrl);

              case 31:
                logDetails = _context3.sent;

                logDetails.data.forEach(function (log) {
                  return _winston2.default.debug(log.message);
                });
                _context3.next = 39;
                break;

              case 35:
                _context3.prev = 35;
                _context3.t1 = _context3['catch'](24);

                _winston2.default.error(_context3.t1.message);
                throw new Error('Could not retrieve deployment log');

              case 39:
                if (!(progress.data.status === 4)) {
                  _context3.next = 43;
                  break;
                }

                _winston2.default.info('Finished successfully');
                _context3.next = 44;
                break;

              case 43:
                throw new Error('Failed to complete server initialisation');

              case 44:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[11, 17], [24, 35]]);
      }));

      function deployBundle(_x) {
        return _ref4.apply(this, arguments);
      }

      return deployBundle;
    }()
  }]);

  return AzureMethods;
}();

exports.default = AzureMethods;