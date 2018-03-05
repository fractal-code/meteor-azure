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

    // Ensure settings for single-site (object) and multi-site (array of objects) are interoperable
    this.sites = settingsFile['meteor-azure'];
    if (!Array.isArray(this.sites)) {
      this.sites = [this.sites];
    }

    // Initialise each site
    this.sites.map(function (site) {
      var currentSite = site;

      currentSite.isSlot = currentSite.slotName !== undefined;

      // Determine unique name, must identify multiple slots from same site
      currentSite.uniqueName = currentSite.siteName;
      if (currentSite.isSlot) {
        currentSite.uniqueName = `${currentSite.uniqueName}-${currentSite.slotName}`;
      }

      // Configure Kudu API connection
      _winston2.default.debug(`${currentSite.uniqueName}: configure kudu api`);
      currentSite.kuduClient = _axios2.default.create({
        baseURL: `https://${currentSite.uniqueName}.scm.azurewebsites.net`,
        auth: currentSite.deploymentCreds
      });

      return currentSite;
    });
  }

  // Helper for async iteration over sites, returns a single promise (i.e awaitable)


  _createClass(AzureMethods, [{
    key: 'validateKuduCredentials',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _winston2.default.info('Validating Kudu connection');
                _context2.next = 3;
                return AzureMethods.forEachSite(this.sites, function () {
                  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(site) {
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
                            _context.t0 = _context['catch'](0);

                            if (!(_context.t0.response && _context.t0.response.status === 401)) {
                              _context.next = 10;
                              break;
                            }

                            _winston2.default.debug(_context.t0);
                            throw new Error('Could not authenticate with Kudu (check deployment credentials)');

                          case 10:
                            // Report unknown error as-is
                            _winston2.default.error(_context.t0);
                            throw new Error('Could not connect to Kudu');

                          case 12:
                          case 'end':
                            return _context.stop();
                        }
                      }
                    }, _callee, _this, [[0, 5]]);
                  }));

                  return function (_x) {
                    return _ref2.apply(this, arguments);
                  };
                }());

              case 3:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function validateKuduCredentials() {
        return _ref.apply(this, arguments);
      }

      return validateKuduCredentials;
    }()
  }, {
    key: 'authenticateWithSdk',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
        var _this2 = this;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return AzureMethods.forEachSite(this.sites, function () {
                  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(site) {
                    var currentSite, servicePrincipal, tenantId, subscriptionId, credentials, appId, secret;
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            currentSite = site;
                            servicePrincipal = currentSite.servicePrincipal, tenantId = currentSite.tenantId, subscriptionId = currentSite.subscriptionId;
                            credentials = void 0;

                            /* Retrieve credential from MS API, uses service principal when available
                             or otherwise requests an interactive login */

                            if (!(servicePrincipal !== undefined)) {
                              _context3.next = 11;
                              break;
                            }

                            appId = servicePrincipal.appId, secret = servicePrincipal.secret;

                            _winston2.default.info(`${currentSite.uniqueName}: Authenticating with service principal`);
                            _context3.next = 8;
                            return _msRestAzure2.default.loginWithServicePrincipalSecret(appId, secret, tenantId);

                          case 8:
                            credentials = _context3.sent;
                            _context3.next = 15;
                            break;

                          case 11:
                            _winston2.default.info(`${currentSite.uniqueName}: Authenticating with interactive login...`);
                            _context3.next = 14;
                            return _msRestAzure2.default.interactiveLogin({ domain: tenantId });

                          case 14:
                            credentials = _context3.sent;

                          case 15:

                            // Initialise Azure SDK using MS credential
                            _winston2.default.debug(`${currentSite.uniqueName}: completed Azure authentication`);
                            currentSite.azureSdk = new _azureArmWebsite2.default(credentials, subscriptionId).webApps;

                          case 17:
                          case 'end':
                            return _context3.stop();
                        }
                      }
                    }, _callee3, _this2);
                  }));

                  return function (_x2) {
                    return _ref4.apply(this, arguments);
                  };
                }());

              case 2:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function authenticateWithSdk() {
        return _ref3.apply(this, arguments);
      }

      return authenticateWithSdk;
    }()
  }, {
    key: 'updateApplicationSettings',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
        var _this3 = this;

        var meteorSettings, sites;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                meteorSettings = this.meteorSettings, sites = this.sites;
                _context6.next = 3;
                return AzureMethods.forEachSite(sites, function () {
                  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(site) {
                    var newSettings, resourceGroup, envVariables, siteName, slotName, uniqueName, azureSdk, isSlot, nodeVersion, npmVersion;
                    return regeneratorRuntime.wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            newSettings = void 0;

                            // Unnest site details for better code readability

                            resourceGroup = site.resourceGroup, envVariables = site.envVariables, siteName = site.siteName, slotName = site.slotName, uniqueName = site.uniqueName, azureSdk = site.azureSdk, isSlot = site.isSlot;


                            _winston2.default.info(`${uniqueName}: Updating Azure application settings`);

                            // Retrieve current settings from Azure to serve as a starting point
                            _winston2.default.debug(`${uniqueName}: retrieve existing values`);

                            if (!isSlot) {
                              _context5.next = 10;
                              break;
                            }

                            _context5.next = 7;
                            return azureSdk.listApplicationSettingsSlot(resourceGroup, siteName, slotName);

                          case 7:
                            newSettings = _context5.sent;
                            _context5.next = 13;
                            break;

                          case 10:
                            _context5.next = 12;
                            return azureSdk.listApplicationSettings(resourceGroup, siteName);

                          case 12:
                            newSettings = _context5.sent;

                          case 13:

                            // Set environment variables (from settings file)
                            _winston2.default.debug(`${uniqueName}: set environment variables`);
                            Object.assign(newSettings.properties, envVariables);

                            // Set Meteor settings (from settings file)
                            _winston2.default.debug(`${uniqueName}: set Meteor settings`);
                            Object.assign(newSettings.properties, {
                              METEOR_SETTINGS: meteorSettings,
                              METEOR_SKIP_NPM_REBUILD: 1
                            });

                            // Set Kudu deployment settings
                            _winston2.default.debug(`${uniqueName}: set Kudu deployment settings`);
                            Object.assign(newSettings.properties, {
                              METEOR_AZURE_TIMESTAMP: Date.now(), // abort incomplete deploy
                              SCM_COMMAND_IDLE_TIMEOUT: 3600,
                              SCM_TOUCH_WEBCONFIG_AFTER_DEPLOYMENT: 0
                            });

                            // Set Node/NPM versions (based on current Meteor)
                            nodeVersion = _shelljs2.default.exec('meteor node -v', { silent: true }).stdout.trim();
                            npmVersion = _shelljs2.default.exec('meteor npm -v', { silent: true }).stdout.trim();

                            _winston2.default.debug(`${uniqueName}: set Node to ${nodeVersion}`);
                            _winston2.default.debug(`${uniqueName}: set NPM to v${npmVersion}`);
                            Object.assign(newSettings.properties, {
                              METEOR_AZURE_NODE_VERSION: nodeVersion,
                              METEOR_AZURE_NPM_VERSION: npmVersion
                            });

                            // Serialise values to ensure consistency/compliance of formating
                            _winston2.default.debug(`${uniqueName}: serialise values`);
                            Object.keys(newSettings.properties).forEach(function (key) {
                              newSettings.properties[key] = (0, _jsesc2.default)(newSettings.properties[key], {
                                json: true,
                                wrap: false
                              });
                            });

                            // Push new settings to Azure
                            _winston2.default.debug(`${uniqueName}: push new settings`);

                            if (!isSlot) {
                              _context5.next = 32;
                              break;
                            }

                            _context5.next = 30;
                            return azureSdk.updateApplicationSettingsSlot(resourceGroup, siteName, newSettings, slotName);

                          case 30:
                            _context5.next = 34;
                            break;

                          case 32:
                            _context5.next = 34;
                            return azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);

                          case 34:
                          case 'end':
                            return _context5.stop();
                        }
                      }
                    }, _callee5, _this3);
                  }));

                  return function (_x3) {
                    return _ref6.apply(this, arguments);
                  };
                }());

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function updateApplicationSettings() {
        return _ref5.apply(this, arguments);
      }

      return updateApplicationSettings;
    }()
  }, {
    key: 'deployBundle',
    value: function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(_ref7) {
        var _this4 = this;

        var bundleFile = _ref7.bundleFile;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return AzureMethods.forEachSite(this.sites, function () {
                  var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(site) {
                    return regeneratorRuntime.wrap(function _callee7$(_context7) {
                      while (1) {
                        switch (_context7.prev = _context7.next) {
                          case 0:
                            // Upload bundle tarball
                            _winston2.default.info(`${site.uniqueName}: Deploying bundle tarball`);
                            _context7.next = 3;
                            return site.kuduClient({
                              method: 'put',
                              url: '/vfs/meteor-azure/bundle.tar.gz',
                              headers: { 'If-Match': '*' },
                              data: _fs2.default.createReadStream(bundleFile),
                              maxContentLength: Infinity
                            });

                          case 3:
                          case 'end':
                            return _context7.stop();
                        }
                      }
                    }, _callee7, _this4);
                  }));

                  return function (_x5) {
                    return _ref9.apply(this, arguments);
                  };
                }());

              case 2:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function deployBundle(_x4) {
        return _ref8.apply(this, arguments);
      }

      return deployBundle;
    }()
  }, {
    key: 'serverInitialisation',
    value: function () {
      var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(_ref10) {
        var _this5 = this;

        var isDebug = _ref10.isDebug;
        var sites;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                sites = this.sites;
                _context10.next = 3;
                return AzureMethods.forEachSite(sites, function () {
                  var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(site) {
                    var kuduDeploy, delay, progress, kuduLogs, logDetailsUrl, logDetails;
                    return regeneratorRuntime.wrap(function _callee9$(_context9) {
                      while (1) {
                        switch (_context9.prev = _context9.next) {
                          case 0:
                            // Manually trigger Kudu deploy, fetches our internal repo (contains custom deploy script)
                            _winston2.default.info(`${site.uniqueName}: Running server initialisation`);
                            _context9.next = 3;
                            return site.kuduClient({
                              method: 'post',
                              url: '/deploy?isAsync=true',
                              data: {
                                format: 'basic',
                                url: 'https://github.com/fractal-code/meteor-azure-server-init.git'
                              }
                            });

                          case 3:
                            kuduDeploy = _context9.sent;


                            // Poll Kudu log entries to track live status
                            _winston2.default.info(`${site.uniqueName}: Polling server status...`);

                            delay = function delay(ms) {
                              return new Promise(function (resolve) {
                                return setTimeout(resolve, ms);
                              });
                            };

                            progress = void 0;

                          case 7:
                            _context9.prev = 7;
                            _context9.next = 10;
                            return site.kuduClient.get(kuduDeploy.headers.location);

                          case 10:
                            progress = _context9.sent;
                            _context9.next = 13;
                            return delay(10000);

                          case 13:
                            _context9.next = 18;
                            break;

                          case 15:
                            _context9.prev = 15;
                            _context9.t0 = _context9['catch'](7);

                            (function () {
                              /* Report polling error while ensuring users understand this doesn't indicate
                               a failed deployment. Provide instructions to continue tracking status
                               manually using Kudu interface */
                              _winston2.default.debug(_context9.t0.message);
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

                          case 18:
                            if (progress.data.complete === false) {
                              _context9.next = 7;
                              break;
                            }

                          case 19:
                            if (!(isDebug === true)) {
                              _context9.next = 36;
                              break;
                            }

                            _winston2.default.debug(`${site.uniqueName}: Retrieving Kudu deployment log...`);
                            _context9.prev = 21;
                            _context9.next = 24;
                            return site.kuduClient(`/deployments/${progress.data.id}/log`);

                          case 24:
                            kuduLogs = _context9.sent;
                            logDetailsUrl = kuduLogs.data.find(function (log) {
                              return log.details_url !== null;
                            }).details_url;
                            _context9.next = 28;
                            return site.kuduClient(logDetailsUrl);

                          case 28:
                            logDetails = _context9.sent;

                            logDetails.data.forEach(function (log) {
                              return _winston2.default.debug(log.message);
                            });
                            _context9.next = 36;
                            break;

                          case 32:
                            _context9.prev = 32;
                            _context9.t1 = _context9['catch'](21);

                            _winston2.default.error(_context9.t1.message);
                            throw new Error('Could not retrieve deployment log');

                          case 36:
                            if (!(progress.data.status === 4)) {
                              _context9.next = 40;
                              break;
                            }

                            _winston2.default.info(`${site.uniqueName}: Finished successfully`);
                            _context9.next = 41;
                            break;

                          case 40:
                            throw new Error('Failed to complete server initialisation');

                          case 41:
                          case 'end':
                            return _context9.stop();
                        }
                      }
                    }, _callee9, _this5, [[7, 15], [21, 32]]);
                  }));

                  return function (_x7) {
                    return _ref12.apply(this, arguments);
                  };
                }());

              case 3:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function serverInitialisation(_x6) {
        return _ref11.apply(this, arguments);
      }

      return serverInitialisation;
    }()
  }], [{
    key: 'forEachSite',
    value: function () {
      var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(sites, siteMethod) {
        var _this6 = this;

        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return Promise.all(sites.map(function () {
                  var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(site) {
                    return regeneratorRuntime.wrap(function _callee11$(_context11) {
                      while (1) {
                        switch (_context11.prev = _context11.next) {
                          case 0:
                            _context11.prev = 0;
                            _context11.next = 3;
                            return siteMethod(site);

                          case 3:
                            _context11.next = 8;
                            break;

                          case 5:
                            _context11.prev = 5;
                            _context11.t0 = _context11['catch'](0);
                            throw new Error(`${site.uniqueName}: ${_context11.t0.message}`);

                          case 8:
                          case 'end':
                            return _context11.stop();
                        }
                      }
                    }, _callee11, _this6, [[0, 5]]);
                  }));

                  return function (_x10) {
                    return _ref14.apply(this, arguments);
                  };
                }()));

              case 2:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function forEachSite(_x8, _x9) {
        return _ref13.apply(this, arguments);
      }

      return forEachSite;
    }()
  }]);

  return AzureMethods;
}();

exports.default = AzureMethods;