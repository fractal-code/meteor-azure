// Azure methods

import AzureSdk from 'azure-arm-website';
import msRest from 'ms-rest-azure';
import omit from 'lodash.omit';
import axios from 'axios';
import shell from 'shelljs';
import jsesc from 'jsesc';
import fs from 'fs';
import winston from 'winston';

export default class AzureMethods {
  constructor(settingsFile) {
    this.meteorSettings = omit(settingsFile, 'meteor-azure');
    this.settings = settingsFile['meteor-azure'];
    this.isSlot = (this.settings.slotName !== undefined);

    // Determine Kudu site name
    let kuduName = this.settings.siteName;
    if (this.isSlot) { kuduName = `${kuduName}-${this.settings.slotName}`; }

    // Configure Kudu API connection
    this.kuduClient = axios.create({
      baseURL: `https://${kuduName}.scm.azurewebsites.net`,
      auth: this.settings.deploymentCreds,
    });
  }

  async authenticate() {
    const { servicePrincipal, tenantId, subscriptionId } = this.settings;
    let credentials;

    if (servicePrincipal !== undefined) {
      const { appId, secret } = servicePrincipal;
      winston.info('Authenticating with service principal');
      credentials = await msRest.loginWithServicePrincipalSecret(appId, secret, tenantId);
    } else {
      winston.info('Authenticating with interactive login...');
      credentials = await msRest.interactiveLogin({ domain: tenantId });
    }

    winston.debug('completed Azure authentication');
    this.azureSdk = new AzureSdk(credentials, subscriptionId).webApps;
  }

  async updateApplicationSettings() {
    const { resourceGroup, siteName, slotName, envVariables } = this.settings;
    let newSettings;

    winston.info('Updating Azure application settings');

    // Start with current settings
    if (this.isSlot) {
      newSettings = await this.azureSdk
        .listApplicationSettingsSlot(resourceGroup, siteName, slotName);
    } else {
      newSettings = await this.azureSdk.listApplicationSettings(resourceGroup, siteName);
    }

    // Set environment variables
    winston.debug('set environment variables');
    Object.assign(newSettings.properties, envVariables);

    // Set Meteor settings
    winston.debug('set Meteor settings');
    Object.assign(newSettings.properties, {
      METEOR_SETTINGS: this.meteorSettings,
      METEOR_SKIP_NPM_REBUILD: 1,
    });

    // Set Kudu deployment settings
    winston.debug('set Kudu deployment settings');
    Object.assign(newSettings.properties, {
      METEOR_AZURE_TIMESTAMP: Date.now(), // abort incomplete deploy
      SCM_COMMAND_IDLE_TIMEOUT: 3600,
      SCM_TOUCH_WEBCONFIG_AFTER_DEPLOYMENT: 0,
    });

    // Set Node/NPM versions (based on current Meteor)
    const nodeVersion = shell.exec('meteor node -v', { silent: true }).stdout.trim();
    const npmVersion = shell.exec('meteor npm -v', { silent: true }).stdout.trim();
    winston.debug(`set Node to ${nodeVersion}`);
    winston.debug(`set NPM to v${npmVersion}`);
    Object.assign(newSettings.properties, {
      METEOR_AZURE_NODE_VERSION: nodeVersion,
      METEOR_AZURE_NPM_VERSION: npmVersion,
    });

    // Serialise values
    Object.keys(newSettings.properties).forEach((key) => {
      newSettings.properties[key] = jsesc(newSettings.properties[key], {
        json: true,
        wrap: false,
      });
    });

    // Push new settings
    if (this.isSlot) {
      await this.azureSdk
        .updateApplicationSettingsSlot(resourceGroup, siteName, newSettings, slotName);
    } else {
      await this.azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);
    }
  }

  async deployBundle({ bundleFile, isDebug }) {
    // Upload bundle tarball
    winston.info('Deploying bundle tarball');
    await this.kuduClient({
      method: 'put',
      url: '/vfs/meteor-azure/bundle.tar.gz',
      headers: { 'If-Match': '*' },
      data: fs.createReadStream(bundleFile),
    });

    // Run server initialisation
    const kuduDeploy = await this.kuduClient({
      method: 'post',
      url: '/deploy?isAsync=true',
      data: {
        format: 'basic',
        url: 'https://github.com/fractal-code/meteor-azure-server-init.git',
      },
    });

    winston.info('Running server initialisation, polling for status...');

    // Poll server for deploy status
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let progress;
    do {
      await delay(20000); // 20 second interval
      try {
        progress = await this.kuduClient.get(kuduDeploy.headers.location);
      } catch (error) {
        winston.error(error.message);
        throw new Error('Could not poll server status');
      }
    } while (progress.data.complete === false);


    // Retrieve Kudu deployment log for debug mode
    if (isDebug === true) {
      winston.debug('Retrieving Kudu deployment log...');
      try {
        const kuduLogs = await this.kuduClient(`/deployments/${progress.data.id}/log`);
        const logDetailsUrl = kuduLogs.data.find(log => log.details_url !== null).details_url;
        const logDetails = await this.kuduClient(logDetailsUrl);
        logDetails.data.forEach(log => winston.debug(log.message));
      } catch (error) {
        winston.error(error.message);
        throw new Error('Could not retrieve deployment log');
      }
    }

    // Report deploy status
    if (progress.data.status === 4) {
      winston.info('Finished successfully');
    } else {
      throw new Error('Failed to complete server initialisation');
    }
  }
}
