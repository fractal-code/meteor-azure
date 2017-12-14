// CLI setup

import program from 'commander';
import shell from 'shelljs';
import updateNotifier from 'update-notifier';
import winston from 'winston';
import pkg from '../../package.json';
import { validateSettings, validateMeteor } from './validation';
import compileBundle from './bundle';
import AzureMethods from './azure';

// Notify user of available updates
updateNotifier({ pkg }).notify();

// Configure CLI
program
  .description(pkg.description)
  .version(`v${pkg.version}`, '-v, --version')
  .option('-s, --settings <path>', 'path to settings file [settings.json]', 'settings.json')
  .option('-w, --web-config <path>', 'path to custom web.config file')
  .option('-d, --debug', 'enable debug mode')
  .option('-q, --quiet', 'enable quite mode')
  .parse(process.argv);

// Pretty print logs
winston.cli();

// Terminate on shelljs errors
shell.config.fatal = true;

// Toggle Quiet mode based on user preference
if (program.quiet === true) {
  winston.level = 'error';
  shell.config.silent = true;
}

// Toggle Debug mode based on user preference
if (program.debug === true) {
  winston.level = 'debug';
}

export default async function startup() {
  try {
    // Prechecks
    validateMeteor();
    const settingsFile = validateSettings(program.settings);

    // Configure Azure settings
    const azureMethods = new AzureMethods(settingsFile);
    await azureMethods.validateKuduCredentials();
    await azureMethods.authenticateWithSdk();
    await azureMethods.updateApplicationSettings();

    // Deploy Meteor bundle
    const bundleFile = compileBundle({ customWebConfig: program.webConfig });
    await azureMethods.deployBundle({ bundleFile });

    // Track server initialisation
    await azureMethods.serverInitialisation({ isDebug: program.debug });
  } catch (error) {
    winston.error(error.message);
    process.exit(1);
  }
}
