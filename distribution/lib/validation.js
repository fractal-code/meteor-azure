'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateSettings = validateSettings;
exports.validateMeteor = validateMeteor;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _jsonfile = require('jsonfile');

var _jsonfile2 = _interopRequireDefault(_jsonfile);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _commandExists = require('command-exists');

var _commandExists2 = _interopRequireDefault(_commandExists);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Validation methods

function validateSettings(path) {
  var settingsFile = void 0;

  // Ensure valid json exists
  try {
    settingsFile = _jsonfile2.default.readFileSync(path);
  } catch (error) {
    throw new Error(`Could not read settings file at '${path}'`);
  }

  var schema = _joi2.default.object({
    'meteor-azure': _joi2.default.object({
      siteName: _joi2.default.string(),
      resourceGroup: _joi2.default.string(),
      tenantId: _joi2.default.string(),
      subscriptionId: _joi2.default.string(),
      deploymentCreds: _joi2.default.object({ username: _joi2.default.string(), password: _joi2.default.string() }),
      envVariables: _joi2.default.object({ ROOT_URL: _joi2.default.string(), MONGO_URL: _joi2.default.string() }).unknown(true),
      slotName: _joi2.default.string().optional(),
      servicePrincipal: _joi2.default.object({ appId: _joi2.default.string(), secret: _joi2.default.string() }).optional()
    })
  }).unknown(true); // allow unknown keys (at the top level) for Meteor settings

  // Ensure settings data follows correct format
  _joi2.default.validate(settingsFile, schema, { presence: 'required' }, function (error) {
    if (error) {
      throw new Error(`Settings file: ${error.details[0].message}`);
    }
  });

  return settingsFile;
}

function validateMeteor() {
  var release = void 0;
  var packages = void 0;

  // Ensure Meteor CLI is installed
  if (_commandExists2.default.sync('meteor') === false) {
    throw new Error('Meteor is not installed');
  }

  // Determine current Meteor release based on release file
  try {
    release = _fs2.default.readFileSync('.meteor/release', 'utf8');
    packages = _fs2.default.readFileSync('.meteor/packages', 'utf8');
  } catch (error) {
    /* Abort the program if a release file is not found, this is a strong
       indication we are not in the root project directory */
    throw new Error('You must be in a Meteor project directory');
  }

  // Determine major/minor version numbers by stripping non-numeric characters from release
  var versionNumbers = release.replace(/[^0-9]/g, '');
  var majorVersion = Number.parseInt(versionNumbers.charAt(0), 10);
  var minorVersion = Number.parseInt(versionNumbers.charAt(1), 10);

  // Ensure application does not have force-ssl
  if (packages.includes('force-ssl')) {
    throw new Error('Your app should not use force-ssl package. Please remove it and use the web-config');
  }

  // Ensure current Meteor release is >= 1.4
  if (majorVersion > 1) {
    return;
  }
  if (majorVersion === 1 && minorVersion >= 4) {
    return;
  }
  throw new Error('Meteor version must be >= 1.4');
}