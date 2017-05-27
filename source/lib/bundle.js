// Bundle compilation method

import tmp from 'tmp';
import path from 'path';
import shell from 'shelljs';
import tar from 'tar';
import winston from 'winston';

export default function compileBundle({ webConfigFile }) {
  const workingDir = tmp.dirSync().name;

  winston.info('Compiling application bundle');

  // Install project NPM dependencies
  winston.debug('install NPM dependencies');
  shell.exec('meteor npm install --production');

  // Generate Meteor build
  winston.debug('generate meteor build');
  shell.exec(`meteor build ${workingDir} --directory --server-only --architecture os.windows.x86_32`);
  winston.debug('add web config file');
  shell.cp(webConfigFile, path.join(workingDir, 'bundle'));

  // Create tarball
  winston.debug('create tarball');
  const tarballPath = path.join(workingDir, 'bundle.tar.gz');
  tar.c({
    file: tarballPath,
    sync: true,
    gzip: true,
    cwd: workingDir,
  }, ['bundle']);

  return tarballPath;
}
