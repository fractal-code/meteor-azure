#!/bin/bash

# ----------------------
# Meteor Azure
# Version: 1.4.5
# ----------------------

# ----------------------
# KUDU Deployment Script
# Version: 1.0.8
# ----------------------

# Environment
# ------

SCRIPT_DIR="${BASH_SOURCE[0]%\\*}"
SCRIPT_DIR="${SCRIPT_DIR%/*}"
ARTIFACTS=$SCRIPT_DIR/../artifacts

if [[ ! -n "$DEPLOYMENT_SOURCE" ]]; then
  DEPLOYMENT_SOURCE=$SCRIPT_DIR
fi

if [[ ! -n "$DEPLOYMENT_TARGET" ]]; then
  DEPLOYMENT_TARGET=$ARTIFACTS/wwwroot
else
  KUDU_SERVICE=true
fi

# Validate configuration
if [ -e "$DEPLOYMENT_SOURCE\.config\azure\iisnode.yml" ]; then
  echo "meteor-azure: WARNING! iisnode.yml will not be respected, please move configuration to web.config"
fi
if [ ! -e "$DEPLOYMENT_SOURCE\.config\azure\web.config" ]; then
  echo "meteor-azure: WARNING! No web.config was found (app may not start properly)"
fi
if [ $SCM_COMMAND_IDLE_TIMEOUT != 7200 ]; then
  echo "meteor-azure: WARNING! Not using recommended 'SCM_COMMAND_IDLE_TIMEOUT' (build may abort unexpectedly)"
fi
if [[ -v METEOR_AZURE_NOCACHE ]]; then
  echo "meteor-azure: WARNING! 'METEOR_AZURE_NOCACHE' is enabled (this will increase build times)"
fi
if [ ! -d "$DEPLOYMENT_SOURCE\\$METEOR_AZURE_ROOT.meteor" ]; then
  echo "meteor-azure: ERROR! Could not find Meteor project directory (consider specifying 'METEOR_AZURE_ROOT')"
  exit 1
fi
if [[ ! -v METEOR_AZURE_NODE_VERSION ]]; then
  echo "meteor-azure: ERROR! You must specify App Setting 'METEOR_AZURE_NODE_VERSION'"
  exit 1
fi
if [[ ! -v METEOR_AZURE_NPM_VERSION ]]; then
  echo "meteor-azure: ERROR! You must specify App Setting 'METEOR_AZURE_NPM_VERSION'"
  exit 1
fi
if [[ ! -v ROOT_URL ]]; then
  echo "meteor-azure: ERROR! You must specify App Setting 'ROOT_URL'"
  exit 1
fi

# Prepare cache directory
if [[ -v METEOR_AZURE_NOCACHE && -d D:/home/meteor-azure ]]; then
  echo meteor-azure: Clearing cache
  rm -rf D:/home/meteor-azure
fi
if [ ! -d D:/home/meteor-azure ]; then
  mkdir D:/home/meteor-azure
fi

# Setup
# ------------

cd D:/home/meteor-azure;

# Install Meteor
if [ ! -e .meteor/meteor.bat ]; then
  echo meteor-azure: Installing Meteor
  curl -L -o meteor.tar.gz "https://packages.meteor.com/bootstrap-link?arch=os.windows.x86_32"
  tar -zxf meteor.tar.gz
  rm meteor.tar.gz
fi
export PATH="$HOME/meteor-azure/.meteor:$PATH"

# Install NVM
if [ ! -d nvm ]; then
  echo meteor-azure: Installing NVM
  curl -L -o nvm-noinstall.zip "https://github.com/coreybutler/nvm-windows/releases/download/1.1.1/nvm-noinstall.zip"
  unzip nvm-noinstall.zip -d nvm
  rm nvm-noinstall.zip
  (echo root: D:/home/meteor-azure/nvm && echo proxy: none) > nvm/settings.txt
fi

# Install custom Node
echo meteor-azure: Setting Node version
export NVM_HOME=D:/home/meteor-azure/nvm
nvm/nvm.exe install $METEOR_AZURE_NODE_VERSION 32
if [ ! -e "nvm/v$METEOR_AZURE_NODE_VERSION/node.exe" ]; then
  cp "nvm/v$METEOR_AZURE_NODE_VERSION/node32.exe" "nvm/v$METEOR_AZURE_NODE_VERSION/node.exe"
fi
export PATH="$HOME/meteor-azure/nvm/v$METEOR_AZURE_NODE_VERSION:$PATH"
echo "meteor-azure: Now using Node $(node -v) (32-bit)"

# Install custom NPM
echo meteor-azure: Setting NPM version
if [ "$(npm -v)" != "$METEOR_AZURE_NPM_VERSION" ]; then
  cmd //c npm install -g "npm@$METEOR_AZURE_NPM_VERSION"
fi
echo "meteor-azure: Now using NPM v$(npm -v)"

# Install JSON tool
if ! hash json 2>/dev/null; then
  echo meteor-azure: Installing JSON tool
  npm install -g json
fi

# Validate setup
if [ "$(node -v)" != "v$METEOR_AZURE_NODE_VERSION" ]; then
  echo "ERROR! Could not install Node"
  exit 1
fi
if [ "$(npm -v)" != "$METEOR_AZURE_NPM_VERSION" ]; then
  echo "ERROR! Could not install NPM"
  exit 1
fi
if ! hash json 2>/dev/null; then
  echo "ERROR! Could not install JSON tool"
  exit 1
fi

# Compilation
# ------------

cd "$DEPLOYMENT_SOURCE\\$METEOR_AZURE_ROOT"

# Install NPM dependencies
echo meteor-azure: Installing NPM dependencies
npm prune --production
npm install --production

# Generate Meteor build
if [ -d "$DEPLOYMENT_TEMP\bundle" ]; then
  echo meteor-azure: Cleaning build directory
  rm -rf "$DEPLOYMENT_TEMP\bundle"
fi
echo meteor-azure: Building app
cmd //c meteor build "%DEPLOYMENT_TEMP%" --directory --server-only
if [ ! -e "$DEPLOYMENT_TEMP\bundle\programs\server\package.json" ]; then
  echo "meteor-azure: ERROR! Could not generate Meteor bundle"
  exit 1
fi
cp "$DEPLOYMENT_SOURCE\.config\azure\web.config" "$DEPLOYMENT_TEMP\bundle"

# Set Node runtime
echo meteor-azure: Setting Node runtime
cd "$DEPLOYMENT_TEMP\bundle"
(echo nodeProcessCommandLine: "D:\home\meteor-azure\nvm\v$METEOR_AZURE_NODE_VERSION\node.exe") > iisnode.yml

# Set entry-point
echo meteor-azure: Setting entry-point
cd "$DEPLOYMENT_TEMP\bundle\programs\server"
json -f package.json -e "this.main='../../main.js';this.scripts={ start: 'node ../../main' }" > temp-package.json
rm package.json
cmd //c rename temp-package.json package.json

# Deployment
# ----------

# Sync bundle
echo meteor-azure: Deploying bundle
robocopy "$DEPLOYMENT_TEMP\bundle" $DEPLOYMENT_TARGET //mt //mir //nfl //ndl //njh //njs //nc //ns //np > /dev/null

# Install Meteor server
echo meteor-azure: Installing Meteor server
cd "$DEPLOYMENT_TARGET\programs\server"
npm install --production

echo meteor-azure: Finished successfully
