// Validation methods

import fs from 'fs';
import semver from 'semver';
import jsonfile from 'jsonfile';
import winston from 'winston';
import nth from 'lodash.nth';
import dropRight from 'lodash.dropright';
import Joi from 'joi';
import commandExists from 'command-exists';

export function validateMeteor(architecture) {
  let release;
  let packages;

  // Ensure Meteor CLI is installed
  winston.debug('check Meteor is installed');
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

  // -- Validate current Meteor release compatibility
  winston.debug('validate current Meteor release compatibility');
  const releaseSemver = semver.coerce(release);
  // Ensure >= 1.4
  if (!semver.satisfies(releaseSemver, '>=1.4.0')) { throw new Error('Meteor version must be >=1.4.0'); }
  // Ensure >= 1.6 for 64-bit architecture
  if (architecture === '64' && !semver.satisfies(releaseSemver, '>=1.6.0')) {
    throw new Error('Meteor version must be >=1.6.0 for 64-bit Node');
  }

  // Ensure project does not use 'force-ssl' package
  winston.debug('check for incompatible \'force-ssl\' package');
  if (packages.includes('force-ssl')) {
    throw new Error('The "force-ssl" package is not supported. Please read the docs to configure an HTTPS redirect in your web config.');
  }
}

export function validateSettings(filePath) {
  let settingsFile;

  winston.info(`Validating settings file (${filePath})`);

  // Ensure valid json exists
  winston.debug('check valid json exists');
  try {
    settingsFile = jsonfile.readFileSync(filePath);
  } catch (error) {
    throw new Error(`Could not read settings file at '${filePath}'`);
  }

  // Define schema
  const siteConfig = Joi.object({
    siteName: Joi.string(),
    resourceGroup: Joi.string(),
    tenantId: Joi.string(),
    subscriptionId: Joi.string(),
    deploymentCreds: Joi.object({ username: Joi.string(), password: Joi.string() }),
    envVariables: Joi.object({ ROOT_URL: Joi.string(), MONGO_URL: Joi.string() }).unknown(true),
    slotName: Joi.string().optional(),
    customServerInitRepo: Joi.string().optional(),
    servicePrincipal: Joi.object({ appId: Joi.string(), secret: Joi.string() }).optional(),
  });
  const schema = Joi.object({
    // Accepts config as an object for single-site deploy or array of objects for multi-site
    'meteor-azure': Joi.alternatives([
      siteConfig,
      Joi.array()
        .items(siteConfig)
        // Reject duplicated site
        .unique((a, b) => (a.siteName === b.siteName) && (a.slotName === b.slotName)),
    ]),
  }).unknown(true); // allow unknown keys (at the top level) for Meteor settings

  // Ensure settings data follows schema
  winston.debug('check data follows schema');
  const customDuplicateSiteError = { array: { unique: '!!found duplicated site' } };
  Joi.validate(settingsFile, schema, { presence: 'required', language: customDuplicateSiteError }, (error) => {
    if (error) {
      // Pull error from bottom of stack to get most specific/useful details
      const lastError = nth(error.details, -1);

      // Locate parent of noncompliant field, or otherwise mark as top level
      let pathToParent = 'top level';
      if (lastError.path.length > 1) {
        pathToParent = `"${dropRight(lastError.path).join('.')}"`;
      }

      // Report user-friendly error with relevant complaint/context to errors
      throw new Error(`Settings file (${filePath}): ${lastError.message} in ${pathToParent}`);
    }
  });

  return settingsFile;
}
