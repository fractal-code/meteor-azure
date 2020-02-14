"use strict";

require("core-js/modules/es.array.for-each");

require("core-js/modules/es.array.map");

require("core-js/modules/es.object.assign");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.trim");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("regenerator-runtime/runtime");

var _azureArmWebsite = _interopRequireDefault(require("azure-arm-website"));

var _msRestAzure = _interopRequireDefault(require("ms-rest-azure"));

var _lodash = _interopRequireDefault(require("lodash.omit"));

var _delay = _interopRequireDefault(require("delay"));

var _lodash2 = _interopRequireDefault(require("lodash.defaultto"));

var _axios = _interopRequireDefault(require("axios"));

var _shelljs = _interopRequireDefault(require("shelljs"));

var _jsesc = _interopRequireDefault(require("jsesc"));

var _fs = _interopRequireDefault(require("fs"));

var _winston = _interopRequireDefault(require("winston"));

var _pIteration = require("p-iteration");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var AzureMethods =
/*#__PURE__*/
function () {
  function AzureMethods(settingsFile) {
    _classCallCheck(this, AzureMethods);

    this.meteorSettings = (0, _lodash.default)(settingsFile, 'meteor-azure'); // Ensure settings for single-site (object) and multi-site (array of objects) are interoperable

    this.sites = settingsFile['meteor-azure'];

    if (!Array.isArray(this.sites)) {
      this.sites = [this.sites];
    } // Initialise each site


    this.sites.map(function (site) {
      var currentSite = site;
      currentSite.isSlot = currentSite.slotName !== undefined; // Determine unique name, must identify multiple slots from same site

      currentSite.uniqueName = currentSite.siteName;

      if (currentSite.isSlot) {
        currentSite.uniqueName = `${currentSite.uniqueName}-${currentSite.slotName}`;
      } // Configure Kudu API connection


      _winston.default.debug(`${currentSite.uniqueName}: configure kudu api`);

      currentSite.kuduClient = _axios.default.create({
        baseURL: `https://${currentSite.uniqueName}.scm.azurewebsites.net`,
        auth: currentSite.deploymentCreds
      });
      return currentSite;
    });
  } // Helper for concurrent async iteration over sites


  _createClass(AzureMethods, [{
    key: "validateKuduCredentials",
    value: function () {
      var _validateKuduCredentials = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return AzureMethods.forEachSite(this.sites,
                /*#__PURE__*/
                function () {
                  var _ref = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee(site) {
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            _context.prev = 0;
                            _context.next = 3;
                            return site.kuduClient('/api/scm/info');

                          case 3:
                            _context.next = 12;
                            break;

                          case 5:
                            _context.prev = 5;
                            _context.t0 = _context["catch"](0);

                            if (!(_context.t0.response && _context.t0.response.status === 401)) {
                              _context.next = 10;
                              break;
                            }

                            _winston.default.debug(_context.t0);

                            throw new Error('Could not authenticate with Kudu (check deployment credentials)');

                          case 10:
                            // Report unknown error as-is
                            _winston.default.error(_context.t0);

                            throw new Error('Could not connect to Kudu');

                          case 12:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee, null, [[0, 5]]);
                  }));

                  return function (_x) {
                    return _ref.apply(this, arguments);
                  };
                }());

              case 2:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function validateKuduCredentials() {
        return _validateKuduCredentials.apply(this, arguments);
      }

      return validateKuduCredentials;
    }()
  }, {
    key: "authenticateWithSdk",
    value: function () {
      var _authenticateWithSdk = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee4() {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return AzureMethods.forEachSite(this.sites,
                /*#__PURE__*/
                function () {
                  var _ref2 = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee3(site) {
                    var currentSite, servicePrincipal, tenantId, subscriptionId, credentials, appId, secret;
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            currentSite = site;
                            servicePrincipal = currentSite.servicePrincipal, tenantId = currentSite.tenantId, subscriptionId = currentSite.subscriptionId;

                            if (!(servicePrincipal !== undefined)) {
                              _context3.next = 10;
                              break;
                            }

                            appId = servicePrincipal.appId, secret = servicePrincipal.secret;

                            _winston.default.info(`${currentSite.uniqueName}: Authenticating with service principal`);

                            _context3.next = 7;
                            return _msRestAzure.default.loginWithServicePrincipalSecret(appId, secret, tenantId);

                          case 7:
                            credentials = _context3.sent;
                            _context3.next = 14;
                            break;

                          case 10:
                            _winston.default.info(`${currentSite.uniqueName}: Authenticating with interactive login...`);

                            _context3.next = 13;
                            return _msRestAzure.default.interactiveLogin({
                              domain: tenantId
                            });

                          case 13:
                            credentials = _context3.sent;

                          case 14:
                            // Initialise Azure SDK using MS credential
                            _winston.default.debug(`${currentSite.uniqueName}: completed Azure authentication`);

                            currentSite.azureSdk = new _azureArmWebsite.default(credentials, subscriptionId).webApps;

                          case 16:
                          case "end":
                            return _context3.stop();
                        }
                      }
                    }, _callee3);
                  }));

                  return function (_x2) {
                    return _ref2.apply(this, arguments);
                  };
                }());

              case 2:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function authenticateWithSdk() {
        return _authenticateWithSdk.apply(this, arguments);
      }

      return authenticateWithSdk;
    }()
  }, {
    key: "updateApplicationSettings",
    value: function () {
      var _updateApplicationSettings = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee6(architecture) {
        var meteorSettings, sites;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                meteorSettings = this.meteorSettings, sites = this.sites;
                _context6.next = 3;
                return AzureMethods.forEachSite(sites,
                /*#__PURE__*/
                function () {
                  var _ref3 = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee5(site) {
                    var newSettings, resourceGroup, envVariables, siteName, slotName, uniqueName, azureSdk, isSlot, nodeVersion, npmVersion;
                    return regeneratorRuntime.wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            // Unnest site details for better code readability
                            resourceGroup = site.resourceGroup, envVariables = site.envVariables, siteName = site.siteName, slotName = site.slotName, uniqueName = site.uniqueName, azureSdk = site.azureSdk, isSlot = site.isSlot;

                            _winston.default.info(`${uniqueName}: Updating Azure application settings`); // Retrieve current settings from Azure to serve as a starting point


                            _winston.default.debug(`${uniqueName}: retrieve existing values`);

                            if (!isSlot) {
                              _context5.next = 9;
                              break;
                            }

                            _context5.next = 6;
                            return azureSdk.listApplicationSettingsSlot(resourceGroup, siteName, slotName);

                          case 6:
                            newSettings = _context5.sent;
                            _context5.next = 12;
                            break;

                          case 9:
                            _context5.next = 11;
                            return azureSdk.listApplicationSettings(resourceGroup, siteName);

                          case 11:
                            newSettings = _context5.sent;

                          case 12:
                            // Set environment variables (from settings file)
                            _winston.default.debug(`${uniqueName}: set environment variables`);

                            Object.assign(newSettings.properties, envVariables); // Set Meteor settings (from settings file)

                            _winston.default.debug(`${uniqueName}: set Meteor settings`);

                            Object.assign(newSettings.properties, {
                              METEOR_SETTINGS: meteorSettings,
                              METEOR_SKIP_NPM_REBUILD: 1
                            }); // Set Kudu deployment settings

                            _winston.default.debug(`${uniqueName}: set Kudu deployment settings`);

                            Object.assign(newSettings.properties, {
                              METEOR_AZURE_TIMESTAMP: Date.now(),
                              // abort incomplete deploy
                              SCM_COMMAND_IDLE_TIMEOUT: 3600,
                              SCM_TOUCH_WEBCONFIG_AFTER_DEPLOYMENT: 0
                            }); // Set specified Node architecture

                            _winston.default.debug(`${uniqueName}: set Node architecture to ${architecture}-bit`);

                            Object.assign(newSettings.properties, {
                              METEOR_AZURE_NODE_ARCH: architecture
                            }); // Set Node/NPM versions (based on current Meteor)

                            nodeVersion = _shelljs.default.exec('meteor node -v', {
                              silent: true
                            }).stdout.trim();
                            npmVersion = _shelljs.default.exec('meteor npm -v', {
                              silent: true
                            }).stdout.trim();

                            _winston.default.debug(`${uniqueName}: set Node to ${nodeVersion}`);

                            _winston.default.debug(`${uniqueName}: set NPM to v${npmVersion}`);

                            Object.assign(newSettings.properties, {
                              METEOR_AZURE_NODE_VERSION: nodeVersion,
                              METEOR_AZURE_NPM_VERSION: npmVersion
                            }); // Serialise values to ensure consistency/compliance of formating

                            _winston.default.debug(`${uniqueName}: serialise values`);

                            Object.keys(newSettings.properties).forEach(function (key) {
                              newSettings.properties[key] = (0, _jsesc.default)(newSettings.properties[key], {
                                json: true,
                                wrap: false
                              });
                            }); // Push new settings to Azure

                            _winston.default.debug(`${uniqueName}: push new settings`);

                            if (!isSlot) {
                              _context5.next = 33;
                              break;
                            }

                            _context5.next = 31;
                            return azureSdk.updateApplicationSettingsSlot(resourceGroup, siteName, newSettings, slotName);

                          case 31:
                            _context5.next = 35;
                            break;

                          case 33:
                            _context5.next = 35;
                            return azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);

                          case 35:
                          case "end":
                            return _context5.stop();
                        }
                      }
                    }, _callee5);
                  }));

                  return function (_x4) {
                    return _ref3.apply(this, arguments);
                  };
                }());

              case 3:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function updateApplicationSettings(_x3) {
        return _updateApplicationSettings.apply(this, arguments);
      }

      return updateApplicationSettings;
    }()
  }, {
    key: "deployBundle",
    value: function () {
      var _deployBundle = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee8(_ref4) {
        var bundleFile;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                bundleFile = _ref4.bundleFile;
                _context8.next = 3;
                return AzureMethods.forEachSite(this.sites,
                /*#__PURE__*/
                function () {
                  var _ref5 = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee7(site) {
                    return regeneratorRuntime.wrap(function _callee7$(_context7) {
                      while (1) {
                        switch (_context7.prev = _context7.next) {
                          case 0:
                            // Upload bundle tarball
                            _winston.default.info(`${site.uniqueName}: Deploying bundle tarball`);

                            _context7.next = 3;
                            return site.kuduClient({
                              method: 'put',
                              url: '/vfs/meteor-azure/bundle.tar.gz',
                              headers: {
                                'If-Match': '*'
                              },
                              data: _fs.default.createReadStream(bundleFile),
                              maxContentLength: Infinity
                            });

                          case 3:
                          case "end":
                            return _context7.stop();
                        }
                      }
                    }, _callee7);
                  }));

                  return function (_x6) {
                    return _ref5.apply(this, arguments);
                  };
                }());

              case 3:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function deployBundle(_x5) {
        return _deployBundle.apply(this, arguments);
      }

      return deployBundle;
    }()
  }, {
    key: "serverInitialisation",
    value: function () {
      var _serverInitialisation = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee10(_ref6) {
        var isDebug, sites;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                isDebug = _ref6.isDebug;
                sites = this.sites;
                _context10.next = 4;
                return AzureMethods.forEachSite(sites,
                /*#__PURE__*/
                function () {
                  var _ref7 = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee9(site) {
                    var kuduDeploy, progress, kuduLogs, logDetailsUrl, logDetails;
                    return regeneratorRuntime.wrap(function _callee9$(_context9) {
                      while (1) {
                        switch (_context9.prev = _context9.next) {
                          case 0:
                            // Manually trigger Kudu deploy with custom deploy script
                            _winston.default.info(`${site.uniqueName}: Running server initialisation`);

                            _context9.next = 3;
                            return site.kuduClient({
                              method: 'post',
                              url: '/deploy?isAsync=true',
                              data: {
                                format: 'basic',
                                // Fetch script from provided url or fallback to our internal repo
                                url: (0, _lodash2.default)(site.customServerInitRepo, 'https://github.com/fractal-code/meteor-azure-server-init.git')
                              }
                            });

                          case 3:
                            kuduDeploy = _context9.sent;

                            // Poll Kudu log entries to track live status
                            _winston.default.info(`${site.uniqueName}: Polling server status...`);

                          case 5:
                            _context9.prev = 5;
                            _context9.next = 8;
                            return site.kuduClient.get(kuduDeploy.headers.location);

                          case 8:
                            progress = _context9.sent;
                            _context9.next = 11;
                            return (0, _delay.default)(10000);

                          case 11:
                            _context9.next = 16;
                            break;

                          case 13:
                            _context9.prev = 13;
                            _context9.t0 = _context9["catch"](5);

                            (function () {
                              /* Report polling error while ensuring users understand this doesn't indicate
                               a failed deployment. Provide instructions to continue tracking status
                               manually using Kudu interface */
                              _winston.default.debug(_context9.t0.message);

                              var logId = progress.data.id;
                              var logUrls = sites.map(function (logSite) {
                                return `${logSite.uniqueName}: https://${logSite.uniqueName}.scm.azurewebsites.net/api/vfs/site/deployments/${logId}/log.log`;
                              });
                              throw new Error(`Could not poll server status.
          This is most likely due to an issue with your internet connection and does NOT indicate
          a deployment failure. You may choose to try again, or continue tracking the active deploy
          by opening these log URLs in your browser (may require multiple checks before getting
          a final result):\n${logUrls.join('\n')}\n`);
                            })();

                          case 16:
                            if (progress.data.complete === false) {
                              _context9.next = 5;
                              break;
                            }

                          case 17:
                            if (!(isDebug === true)) {
                              _context9.next = 34;
                              break;
                            }

                            _winston.default.debug(`${site.uniqueName}: Retrieving Kudu deployment log...`);

                            _context9.prev = 19;
                            _context9.next = 22;
                            return site.kuduClient(`/deployments/${progress.data.id}/log`);

                          case 22:
                            kuduLogs = _context9.sent;
                            logDetailsUrl = kuduLogs.data.find(function (log) {
                              return log.details_url !== null;
                            }).details_url;
                            _context9.next = 26;
                            return site.kuduClient(logDetailsUrl);

                          case 26:
                            logDetails = _context9.sent;
                            logDetails.data.forEach(function (log) {
                              return _winston.default.debug(log.message);
                            });
                            _context9.next = 34;
                            break;

                          case 30:
                            _context9.prev = 30;
                            _context9.t1 = _context9["catch"](19);

                            _winston.default.error(_context9.t1.message);

                            throw new Error('Could not retrieve deployment log');

                          case 34:
                            if (!(progress.data.status === 4)) {
                              _context9.next = 38;
                              break;
                            }

                            _winston.default.info(`${site.uniqueName}: Finished successfully`);

                            _context9.next = 39;
                            break;

                          case 38:
                            throw new Error('Failed to complete server initialisation');

                          case 39:
                          case "end":
                            return _context9.stop();
                        }
                      }
                    }, _callee9, null, [[5, 13], [19, 30]]);
                  }));

                  return function (_x8) {
                    return _ref7.apply(this, arguments);
                  };
                }());

              case 4:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function serverInitialisation(_x7) {
        return _serverInitialisation.apply(this, arguments);
      }

      return serverInitialisation;
    }()
  }], [{
    key: "forEachSite",
    value: function () {
      var _forEachSite = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee12(sites, run) {
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return (0, _pIteration.forEach)(sites,
                /*#__PURE__*/
                function () {
                  var _ref8 = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee11(site) {
                    return regeneratorRuntime.wrap(function _callee11$(_context11) {
                      while (1) {
                        switch (_context11.prev = _context11.next) {
                          case 0:
                            _context11.prev = 0;
                            _context11.next = 3;
                            return run(site);

                          case 3:
                            _context11.next = 8;
                            break;

                          case 5:
                            _context11.prev = 5;
                            _context11.t0 = _context11["catch"](0);
                            throw new Error(`${site.uniqueName}: ${_context11.t0.message}`);

                          case 8:
                          case "end":
                            return _context11.stop();
                        }
                      }
                    }, _callee11, null, [[0, 5]]);
                  }));

                  return function (_x11) {
                    return _ref8.apply(this, arguments);
                  };
                }());

              case 2:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12);
      }));

      function forEachSite(_x9, _x10) {
        return _forEachSite.apply(this, arguments);
      }

      return forEachSite;
    }()
  }]);

  return AzureMethods;
}();

exports.default = AzureMethods;