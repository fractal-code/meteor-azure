"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = compileBundle;

var _tmp = _interopRequireDefault(require("tmp"));

var _path = _interopRequireDefault(require("path"));

var _shelljs = _interopRequireDefault(require("shelljs"));

var _tar = _interopRequireDefault(require("tar"));

var _winston = _interopRequireDefault(require("winston"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Bundle compilation method
function compileBundle(_ref) {
  var customWebConfig = _ref.customWebConfig,
      architecture = _ref.architecture;

  var workingDir = _tmp.default.dirSync().name;

  _winston.default.info('Compiling application bundle'); // Generate Meteor build


  _winston.default.debug('generate meteor build');

  _shelljs.default.exec(`meteor build ${workingDir} --directory --server-only --architecture os.windows.x86_${architecture}`); // Add custom web config


  if (customWebConfig !== undefined) {
    _winston.default.debug('add custom web config');

    try {
      _shelljs.default.cp(customWebConfig, _path.default.join(workingDir, 'bundle', 'web.config'));
    } catch (error) {
      throw new Error(`Could not read web config file at '${customWebConfig}'`);
    }
  } else {
    _winston.default.warn('Using default web config');
  } // Cleanup broken symlinks


  _winston.default.debug('checking for broken symlinks');

  _shelljs.default.find(_path.default.join(workingDir, 'bundle')).forEach(function (symlinkPath) {
    // Matches symlinks that do not exist
    if (_shelljs.default.test('-L', symlinkPath) && !_shelljs.default.test('-e', symlinkPath)) {
      // Delete file
      _shelljs.default.rm('-f', symlinkPath);

      _winston.default.debug(`deleted symlink at '${symlinkPath}'`);
    }
  }); // Create tarball


  _winston.default.debug('create tarball');

  var tarballPath = _path.default.join(workingDir, 'bundle.tar.gz');

  _tar.default.c({
    file: tarballPath,
    sync: true,
    follow: true,
    gzip: true,
    cwd: workingDir
  }, ['bundle']);

  return tarballPath;
}