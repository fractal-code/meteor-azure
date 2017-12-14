'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = compileBundle;

var _tmp = require('tmp');

var _tmp2 = _interopRequireDefault(_tmp);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

var _tar = require('tar');

var _tar2 = _interopRequireDefault(_tar);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function compileBundle(_ref) {
  var customWebConfig = _ref.customWebConfig;

  var workingDir = _tmp2.default.dirSync().name;

  _winston2.default.info('Compiling application bundle');

  // Generate Meteor build
  _winston2.default.debug('generate meteor build');
  _shelljs2.default.exec(`meteor build ${workingDir} --directory --server-only --architecture os.windows.x86_32`);

  // Add custom web config
  if (customWebConfig !== undefined) {
    _winston2.default.debug('add custom web config');
    try {
      _shelljs2.default.cp(customWebConfig, _path2.default.join(workingDir, 'bundle', 'web.config'));
    } catch (error) {
      throw new Error(`Could not read web config file at '${customWebConfig}'`);
    }
  } else {
    _winston2.default.warn('Using default web config');
  }

  // Cleanup broken symlinks
  _winston2.default.debug('checking for broken symlinks');
  _shelljs2.default.find(_path2.default.join(workingDir, 'bundle')).forEach(function (symlinkPath) {
    // Matches symlinks that do not exist
    if (_shelljs2.default.test('-L', symlinkPath) && !_shelljs2.default.test('-e', symlinkPath)) {
      // Delete file
      _shelljs2.default.rm('-f', symlinkPath);
      _winston2.default.debug(`deleted symlink at '${symlinkPath}'`);
    }
  });

  // Create tarball
  _winston2.default.debug('create tarball');
  var tarballPath = _path2.default.join(workingDir, 'bundle.tar.gz');
  _tar2.default.c({
    file: tarballPath,
    sync: true,
    gzip: true,
    cwd: workingDir
  }, ['bundle']);

  return tarballPath;
} // Bundle compilation method