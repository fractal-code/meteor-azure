// Validation methods

import fs from 'fs';
import jsonfile from 'jsonfile';
import Joi from 'joi';
import commandExists from 'command-exists';

export function validateSettings(path) {
  let settingsFile;

  // Ensure valid json exists
  try {
    settingsFile = jsonfile.readFileSync(path);
  } catch (error) {
    throw new Error(`Could not read settings file at '${path}'`);
  }

  const schema = Joi.object({
    'meteor-azure': Joi.object({
      siteName: Joi.string(),
      resourceGroup: Joi.string(),
      tenantId: Joi.string(),
      subscriptionId: Joi.string(),
      deploymentCreds: Joi.object({ username: Joi.string(), password: Joi.string() }),
      envVariables: Joi.object({ ROOT_URL: Joi.string(), MONGO_URL: Joi.string() }).unknown(true),
      slotName: Joi.string().optional(),
      servicePrincipal: Joi.object({ appId: Joi.string(), secret: Joi.string() }).optional(),
    }),
  }).unknown(true); // allow unknown keys (at the top level) for Meteor settings

  // Ensure settings data follows correct format
  Joi.validate(settingsFile, schema, { presence: 'required' }, (error) => {
    if (error) {
      throw new Error(`Settings file: ${error.details[0].message}`);
    }
  });

  return settingsFile;
}

export function validateMeteor() {
  let release;
  let packages;

  // Ensure Meteor CLI is installed
  if (commandExists.sync('meteor') === false) {
    throw new Error('Meteor is not installed');
  }

  // Determine current release/packages from '.meteor' directory
  try {
    release = fs.readFileSync('.meteor/release', 'utf8');
    packages = fs.readFileSync('.meteor/packages', 'utf8');
  } catch (error) {
    /* Abort the program if files are not found, this is a strong
       indication we may not be in the root project directory */
    throw new Error('You must be in a Meteor project directory');
  }

  // Determine major/minor version numbers by stripping non-numeric characters from release
  const versionNumbers = release.replace(/[^0-9]/g, '');
  const majorVersion = Number.parseInt(versionNumbers.charAt(0), 10);
  const minorVersion = Number.parseInt(versionNumbers.charAt(1), 10);

  // Ensure project does not use 'force-ssl' package
  if (packages.includes('force-ssl')) {
    throw new Error('The "force-ssl" package is not supported. Please read the docs to configure an HTTPS redirect in your web config.');
  }

  // Ensure current Meteor release is >= 1.4
  if (majorVersion > 1) { return; }
  if (majorVersion === 1 && minorVersion >= 4) { return; }
  throw new Error('Meteor version must be >= 1.4');
}
