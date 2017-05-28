// Bundle compilation method

import tmp from 'tmp';
import path from 'path';
import shell from 'shelljs';
import tar from 'tar';
import winston from 'winston';

export default function compileBundle({ customWebConfig }) {
  const workingDir = tmp.dirSync().name;

  winston.info('Compiling application bundle');

  // Generate Meteor build
  winston.debug('generate meteor build');
  shell.exec(`meteor build ${workingDir} --directory --server-only --architecture os.windows.x86_32`);

  // Add custom web config
  if (customWebConfig !== undefined) {
    winston.debug('add custom web config');
    shell.cp(customWebConfig, path.join(workingDir, 'bundle'));
  }

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
