"use strict";

require("core-js/modules/es.array.includes");

require("core-js/modules/es.string.includes");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateMeteor = validateMeteor;
exports.validateSettings = validateSettings;

var _fs = _interopRequireDefault(require("fs"));

var _semver = _interopRequireDefault(require("semver"));

var _jsonfile = _interopRequireDefault(require("jsonfile"));

var _winston = _interopRequireDefault(require("winston"));

var _lodash = _interopRequireDefault(require("lodash.nth"));

var _lodash2 = _interopRequireDefault(require("lodash.dropright"));

var _joi = _interopRequireDefault(require("joi"));

var _commandExists = _interopRequireDefault(require("command-exists"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Validation methods
function validateMeteor(architecture) {
  var release;
  var packages; // Ensure Meteor CLI is installed

  _winston.default.debug('check Meteor is installed');

  if (_commandExists.default.sync('meteor') === false) {
    throw new Error('Meteor is not installed');
  } // Determine current release/packages from '.meteor' directory


  try {
    release = _fs.default.readFileSync('.meteor/release', 'utf8');
    packages = _fs.default.readFileSync('.meteor/packages', 'utf8');
  } catch (error) {
    /* Abort the program if files are not found, this is a strong
       indication we may not be in the root project directory */
    throw new Error('You must be in a Meteor project directory');
  } // -- Validate current Meteor release compatibility


  _winston.default.debug('validate current Meteor release compatibility');

  var releaseSemver = _semver.default.coerce(release); // Ensure >= 1.4


  if (!_semver.default.satisfies(releaseSemver, '>=1.4.0')) {
    throw new Error('Meteor version must be >=1.4.0');
  } // Ensure >= 1.6 for 64-bit architecture


  if (architecture === '64' && !_semver.default.satisfies(releaseSemver, '>=1.6.0')) {
    throw new Error('Meteor version must be >=1.6.0 for 64-bit Node');
  } // Ensure project does not use 'force-ssl' package


  _winston.default.debug('check for incompatible \'force-ssl\' package');

  if (packages.includes('force-ssl')) {
    throw new Error('The "force-ssl" package is not supported. Please read the docs to configure an HTTPS redirect in your web config.');
  }
}

function validateSettings(filePath) {
  var settingsFile;

  _winston.default.info(`Validating settings file (${filePath})`); // Ensure valid json exists


  _winston.default.debug('check valid json exists');

  try {
    settingsFile = _jsonfile.default.readFileSync(filePath);
  } catch (error) {
    throw new Error(`Could not read settings file at '${filePath}'`);
  } // Define schema


  var siteConfig = _joi.default.object({
    siteName: _joi.default.string(),
    resourceGroup: _joi.default.string(),
    tenantId: _joi.default.string(),
    subscriptionId: _joi.default.string(),
    deploymentCreds: _joi.default.object({
      username: _joi.default.string(),
      password: _joi.default.string()
    }),
    envVariables: _joi.default.object({
      ROOT_URL: _joi.default.string(),
      MONGO_URL: _joi.default.string()
    }).unknown(true),
    slotName: _joi.default.string().optional(),
    customServerInitRepo: _joi.default.string().optional(),
    servicePrincipal: _joi.default.object({
      appId: _joi.default.string(),
      secret: _joi.default.string()
    }).optional()
  });

  var schema = _joi.default.object({
    // Accepts config as an object for single-site deploy or array of objects for multi-site
    'meteor-azure': _joi.default.alternatives([siteConfig, _joi.default.array().items(siteConfig) // Reject duplicated site
    .unique(function (a, b) {
      return a.siteName === b.siteName && a.slotName === b.slotName;
    })])
  }).unknown(true); // allow unknown keys (at the top level) for Meteor settings
  // Ensure settings data follows schema


  _winston.default.debug('check data follows schema');

  var customDuplicateSiteError = {
    array: {
      unique: '!!found duplicated site'
    }
  };

  _joi.default.validate(settingsFile, schema, {
    presence: 'required',
    language: customDuplicateSiteError
  }, function (error) {
    if (error) {
      // Pull error from bottom of stack to get most specific/useful details
      var lastError = (0, _lodash.default)(error.details, -1); // Locate parent of noncompliant field, or otherwise mark as top level

      var pathToParent = 'top level';

      if (lastError.path.length > 1) {
        pathToParent = `"${(0, _lodash2.default)(lastError.path).join('.')}"`;
      } // Report user-friendly error with relevant complaint/context to errors


      throw new Error(`Settings file (${filePath}): ${lastError.message} in ${pathToParent}`);
    }
  });

  return settingsFile;
}