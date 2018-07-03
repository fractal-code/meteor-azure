// Azure methods

import AzureSdk from 'azure-arm-website';
import msRest from 'ms-rest-azure';
import omit from 'lodash.omit';
import defaultTo from 'lodash.defaultto';
import axios from 'axios';
import shell from 'shelljs';
import jsesc from 'jsesc';
import fs from 'fs';
import winston from 'winston';

export default class AzureMethods {
  constructor(settingsFile) {
    this.meteorSettings = omit(settingsFile, 'meteor-azure');

    // Ensure settings for single-site (object) and multi-site (array of objects) are interoperable
    this.sites = settingsFile['meteor-azure'];
    if (!Array.isArray(this.sites)) { this.sites = [this.sites]; }

    // Initialise each site
    this.sites.map((site) => {
      const currentSite = site;

      currentSite.isSlot = (currentSite.slotName !== undefined);

      // Determine unique name, must identify multiple slots from same site
      currentSite.uniqueName = currentSite.siteName;
      if (currentSite.isSlot) { currentSite.uniqueName = `${currentSite.uniqueName}-${currentSite.slotName}`; }

      // Configure Kudu API connection
      winston.debug(`${currentSite.uniqueName}: configure kudu api`);
      currentSite.kuduClient = axios.create({
        baseURL: `https://${currentSite.uniqueName}.scm.azurewebsites.net`,
        auth: currentSite.deploymentCreds,
      });

      return currentSite;
    });
  }

  // Helper for async iteration over sites, returns a single promise (i.e awaitable)
  static async forEachSite(sites, siteMethod) {
    // Execute provided method on each site concurrently
    await Promise.all(sites.map(async (site) => {
      try {
        await siteMethod(site);
      } catch (error) {
        // Attach relevant site context to error
        throw new Error(`${site.uniqueName}: ${error.message}`);
      }
    }));
  }

  async validateKuduCredentials() {
    await AzureMethods.forEachSite(this.sites, async (site) => {
      try {
        // Make dummy request to test Kudu auth
        await site.kuduClient('/api/scm/info');
      } catch (error) {
        // Report user-friendly 401 error
        if (error.response && error.response.status === 401) {
          winston.debug(error);
          throw new Error('Could not authenticate with Kudu (check deployment credentials)');
        }
        // Report unknown error as-is
        winston.error(error);
        throw new Error('Could not connect to Kudu');
      }
    });
  }

  async authenticateWithSdk() {
    await AzureMethods.forEachSite(this.sites, async (site) => {
      const currentSite = site;
      const { servicePrincipal, tenantId, subscriptionId } = currentSite;
      let credentials;

      /* Retrieve credential from MS API, uses service principal when available
       or otherwise requests an interactive login */
      if (servicePrincipal !== undefined) {
        const { appId, secret } = servicePrincipal;
        winston.info(`${currentSite.uniqueName}: Authenticating with service principal`);
        credentials = await msRest.loginWithServicePrincipalSecret(appId, secret, tenantId);
      } else {
        winston.info(`${currentSite.uniqueName}: Authenticating with interactive login...`);
        credentials = await msRest.interactiveLogin({ domain: tenantId });
      }

      // Initialise Azure SDK using MS credential
      winston.debug(`${currentSite.uniqueName}: completed Azure authentication`);
      currentSite.azureSdk = new AzureSdk(credentials, subscriptionId).webApps;
    });
  }

  async updateApplicationSettings(architecture) {
    const { meteorSettings, sites } = this;

    await AzureMethods.forEachSite(sites, async (site) => {
      let newSettings;

      // Unnest site details for better code readability
      const {
        resourceGroup, envVariables, siteName, slotName, uniqueName, azureSdk, isSlot,
      } = site;

      winston.info(`${uniqueName}: Updating Azure application settings`);

      // Retrieve current settings from Azure to serve as a starting point
      winston.debug(`${uniqueName}: retrieve existing values`);
      if (isSlot) {
        newSettings = await azureSdk.listApplicationSettingsSlot(resourceGroup, siteName, slotName);
      } else {
        newSettings = await azureSdk.listApplicationSettings(resourceGroup, siteName);
      }

      // Set environment variables (from settings file)
      winston.debug(`${uniqueName}: set environment variables`);
      Object.assign(newSettings.properties, envVariables);

      // Set Meteor settings (from settings file)
      winston.debug(`${uniqueName}: set Meteor settings`);
      Object.assign(newSettings.properties, {
        METEOR_SETTINGS: meteorSettings,
        METEOR_SKIP_NPM_REBUILD: 1,
      });

      // Set Kudu deployment settings
      winston.debug(`${uniqueName}: set Kudu deployment settings`);
      Object.assign(newSettings.properties, {
        METEOR_AZURE_TIMESTAMP: Date.now(), // abort incomplete deploy
        SCM_COMMAND_IDLE_TIMEOUT: 3600,
        SCM_TOUCH_WEBCONFIG_AFTER_DEPLOYMENT: 0,
      });

      // Set specified Node architecture
      winston.debug(`${uniqueName}: set Node architecture to ${architecture}-bit`);
      Object.assign(newSettings.properties, {
        METEOR_AZURE_NODE_ARCH: architecture,
      });

      // Set Node/NPM versions (based on current Meteor)
      const nodeVersion = shell.exec('meteor node -v', { silent: true }).stdout.trim();
      const npmVersion = shell.exec('meteor npm -v', { silent: true }).stdout.trim();
      winston.debug(`${uniqueName}: set Node to ${nodeVersion}`);
      winston.debug(`${uniqueName}: set NPM to v${npmVersion}`);
      Object.assign(newSettings.properties, {
        METEOR_AZURE_NODE_VERSION: nodeVersion,
        METEOR_AZURE_NPM_VERSION: npmVersion,
      });

      // Serialise values to ensure consistency/compliance of formating
      winston.debug(`${uniqueName}: serialise values`);
      Object.keys(newSettings.properties).forEach((key) => {
        newSettings.properties[key] = jsesc(newSettings.properties[key], {
          json: true,
          wrap: false,
        });
      });

      // Push new settings to Azure
      winston.debug(`${uniqueName}: push new settings`);
      if (isSlot) {
        await azureSdk
          .updateApplicationSettingsSlot(resourceGroup, siteName, newSettings, slotName);
      } else {
        await azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);
      }
    });
  }

  async deployBundle({ bundleFile }) {
    await AzureMethods.forEachSite(this.sites, async (site) => {
      // Upload bundle tarball
      winston.info(`${site.uniqueName}: Deploying bundle tarball`);
      await site.kuduClient({
        method: 'put',
        url: '/vfs/meteor-azure/bundle.tar.gz',
        headers: { 'If-Match': '*' },
        data: fs.createReadStream(bundleFile),
        maxContentLength: Infinity,
      });
    });
  }

  async serverInitialisation({ isDebug }) {
    const { sites } = this;

    await AzureMethods.forEachSite(sites, async (site) => {
      // Manually trigger Kudu deploy with custom deploy script
      winston.info(`${site.uniqueName}: Running server initialisation`);
      const kuduDeploy = await site.kuduClient({
        method: 'post',
        url: '/deploy?isAsync=true',
        data: {
          format: 'basic',
          // Fetch script from provided url or fallback to our internal repo
          url: defaultTo(
            site.customServerInitRepo,
            'https://github.com/fractal-code/meteor-azure-server-init.git',
          ),
        },
      });

      // Poll Kudu log entries to track live status
      winston.info(`${site.uniqueName}: Polling server status...`);
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      let progress;
      do {
        try {
          progress = await site.kuduClient.get(kuduDeploy.headers.location);
          // 10 second interval
          await delay(10000);
        } catch (error) {
          /* Report polling error while ensuring users understand this doesn't indicate
           a failed deployment. Provide instructions to continue tracking status
           manually using Kudu interface */
          winston.debug(error.message);
          const logId = progress.data.id;
          const logUrls = sites.map(logSite => `${logSite.uniqueName}: https://${logSite.uniqueName}.scm.azurewebsites.net/api/vfs/site/deployments/${logId}/log.log`);
          throw new Error(`Could not poll server status.
          This is most likely due to an issue with your internet connection and does NOT indicate
          a deployment failure. You may choose to try again, or continue tracking the active deploy
          by opening these log URLs in your browser (may require multiple checks before getting
          a final result):\n${logUrls.join('\n')}\n`);
        }
      } while (progress.data.complete === false);


      // Provide full Kudu deployment log in debug mode
      if (isDebug === true) {
        winston.debug(`${site.uniqueName}: Retrieving Kudu deployment log...`);
        try {
          const kuduLogs = await site.kuduClient(`/deployments/${progress.data.id}/log`);
          const logDetailsUrl = kuduLogs.data.find(log => log.details_url !== null).details_url;
          const logDetails = await site.kuduClient(logDetailsUrl);
          logDetails.data.forEach(log => winston.debug(log.message));
        } catch (error) {
          winston.error(error.message);
          throw new Error('Could not retrieve deployment log');
        }
      }

      // Report final deploy status
      if (progress.data.status === 4) {
        winston.info(`${site.uniqueName}: Finished successfully`);
      } else {
        throw new Error('Failed to complete server initialisation');
      }
    });
  }
}
