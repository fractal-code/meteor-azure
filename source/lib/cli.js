// CLI setup

import program from 'commander';
import shell from 'shelljs';
import updateNotifier from 'update-notifier';
import winston from 'winston';
import pkg from '../../package.json';
import { validateSettings, validateMeteor } from './validation';
import compileBundle from './bundle';
import AzureMethods from './azure';

updateNotifier({ pkg }).notify();

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

// Terminate on shell error
shell.config.fatal = true;

// Quiet mode
if (program.quiet === true) {
  winston.level = 'error';
  shell.config.silent = true;
}

// Debug mode
if (program.debug === true) {
  winston.level = 'debug';
}

export default async function startup() {
  try {
    validateMeteor();
    const settingsFile = validateSettings(program.settings);
    const azureMethods = new AzureMethods(settingsFile);
    await azureMethods.authenticate();
    await azureMethods.updateApplicationSettings();
    await azureMethods.deployBundle({
      bundleFile: compileBundle({ customWebConfig: program.webConfig }),
      isDebug: program.debug,
    });
  } catch (error) {
    winston.error(error.message);
    process.exit(1);
  }
}
