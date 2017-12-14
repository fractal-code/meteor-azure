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
    try {
      shell.cp(customWebConfig, path.join(workingDir, 'bundle', 'web.config'));
    } catch (error) {
      throw new Error(`Could not read web config file at '${customWebConfig}'`);
    }
  } else {
    winston.warn('Using default web config');
  }

  // Cleanup broken symlinks
  winston.debug('checking for broken symlinks');
  shell.find(path.join(workingDir, 'bundle')).forEach((symlinkPath) => {
    // Matches symlinks that do not exist
    if (shell.test('-L', symlinkPath) && !shell.test('-e', symlinkPath)) {
      // Delete file
      shell.rm('-f', symlinkPath);
      winston.debug(`deleted symlink at '${symlinkPath}'`);
    }
  });

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
