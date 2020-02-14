// CLI setup

import { forEach as forEachParallel } from 'p-iteration';
import program from 'commander';
import shell from 'shelljs';
import updateNotifier from 'update-notifier';
import winston from 'winston';
import pkg from '../../package.json';
import compileBundle from './bundle';
import AzureMethods from './azure';
import { validateSettings, validateMeteor } from './validation';

// Notify user of available updates
updateNotifier({ pkg }).notify();

// Configure CLI
program
  .description(pkg.description)
  .version(`v${pkg.version}`, '-v, --version')
  .option('-s, --settings <paths>', 'path to settings file or comma-separated list of paths [settings.json]', 'settings.json')
  .option('-w, --web-config <path>', 'path to custom web.config file')
  .option('-a, --architecture <32|64>', 'target node architecture [32]', '32')
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
    // Validate specified architecture
    if (program.architecture !== '32' && program.architecture !== '64') {
      throw new Error('Invalid architecture specified - must be \'32\' or \'64\'');
    }
    winston.info(`Targetting ${program.architecture}-bit Node architecture`);

    // Validate Meteor version/packages
    validateMeteor(program.architecture);

    // Validate settings file(s)
    const settingsFilePaths = program.settings.split(',');
    const settingsFiles = settingsFilePaths.map((path) => validateSettings(path));

    // Configure Azure settings
    const azureMethodsInstances = [];
    await forEachParallel(settingsFiles, async (settingsFile, index) => {
      const azureMethods = new AzureMethods(settingsFile);
      winston.info(`Validating Kudu connection (${settingsFilePaths[index]})`);
      await azureMethods.validateKuduCredentials();
      await azureMethods.authenticateWithSdk();
      await azureMethods.updateApplicationSettings(program.architecture);
      azureMethodsInstances.push(azureMethods);
    });

    // Deploy Meteor bundle
    const bundleFile = compileBundle({
      customWebConfig: program.webConfig,
      architecture: program.architecture,
    });
    await forEachParallel(azureMethodsInstances, async (azureMethods) => {
      await azureMethods.deployBundle({ bundleFile });
    });

    // Track server initialisation
    await forEachParallel(azureMethodsInstances, async (azureMethods) => {
      try {
        await azureMethods.serverInitialisation({ isDebug: program.debug });
      } catch (error) {
        // Do not fail fast (allows more efficient redeploys)
        winston.warn(error.message);
      }
    });
  } catch (error) {
    winston.error(error.message);
    process.exit(1);
  }
}
