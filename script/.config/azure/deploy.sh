#!/bin/bash

# ----------------------
# Meteor Azure
# Version: 1.1.0
# ----------------------

# ----------------------
# KUDU Deployment Script
# Version: 1.0.8
# ----------------------

# Helpers
# -------

exitWithMessageOnError () {
  if [ ! $? -eq 0 ]; then
    echo "An error has occurred during web site deployment."
    echo $1
    exit 1
  fi
}

# Prerequisites
# -------------

# Verify node.js installed
hash node 2>/dev/null
exitWithMessageOnError "Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment."

# Setup
# -----

SCRIPT_DIR="${BASH_SOURCE[0]%\\*}"
SCRIPT_DIR="${SCRIPT_DIR%/*}"
ARTIFACTS=$SCRIPT_DIR/../artifacts
KUDU_SYNC_CMD=${KUDU_SYNC_CMD//\"}

if [[ ! -n "$DEPLOYMENT_SOURCE" ]]; then
  DEPLOYMENT_SOURCE=$SCRIPT_DIR
fi

if [[ ! -n "$NEXT_MANIFEST_PATH" ]]; then
  NEXT_MANIFEST_PATH=$ARTIFACTS/manifest

  if [[ ! -n "$PREVIOUS_MANIFEST_PATH" ]]; then
    PREVIOUS_MANIFEST_PATH=$NEXT_MANIFEST_PATH
  fi
fi

if [[ ! -n "$DEPLOYMENT_TARGET" ]]; then
  DEPLOYMENT_TARGET=$ARTIFACTS/wwwroot
else
  KUDU_SERVICE=true
fi

if [[ ! -n "$KUDU_SYNC_CMD" ]]; then
  # Install kudu sync
  echo Installing Kudu Sync
  npm install kudusync -g --silent
  exitWithMessageOnError "npm failed"

  if [[ ! -n "$KUDU_SERVICE" ]]; then
    # In case we are running locally this is the correct location of kuduSync
    KUDU_SYNC_CMD=kuduSync
  else
    # In case we are running on kudu service this is the correct location of kuduSync
    KUDU_SYNC_CMD=$APPDATA/npm/node_modules/kuduSync/bin/kuduSync
  fi
fi

# Node Helpers
# ------------

selectNodeVersion () {
  if [[ -n "$KUDU_SELECT_NODE_VERSION_CMD" ]]; then
    SELECT_NODE_VERSION="$KUDU_SELECT_NODE_VERSION_CMD \"$DEPLOYMENT_SOURCE\" \"$DEPLOYMENT_TARGET\" \"$DEPLOYMENT_TEMP\""
    eval $SELECT_NODE_VERSION
    exitWithMessageOnError "select node version failed"

    if [[ -e "$DEPLOYMENT_TEMP/__nodeVersion.tmp" ]]; then
      NODE_EXE=`cat "$DEPLOYMENT_TEMP/__nodeVersion.tmp"`
      exitWithMessageOnError "getting node version failed"
    fi

    if [[ -e "$DEPLOYMENT_TEMP/__npmVersion.tmp" ]]; then
      NPM_JS_PATH=`cat "$DEPLOYMENT_TEMP/__npmVersion.tmp"`
      exitWithMessageOnError "getting npm version failed"
    fi

    if [[ ! -n "$NODE_EXE" ]]; then
      NODE_EXE=node
    fi

    NPM_CMD="\"$NODE_EXE\" \"$NPM_JS_PATH\""
  else
    NPM_CMD=npm
    NODE_EXE=node
  fi
}

# Compilation
# ------------

selectNodeVersion

# Set NPM version
echo meteor-azure: Setting NPM version
eval $NPM_CMD install -g npm@"$METEOR_AZURE_NPM_VERSION"
exitWithMessageOnError "setting npm version failed"
npm --version

# Ensure working directory is clean
if [ -d "$LOCALAPPDATA\meteor-azure" ]; then
  rm -rf "$LOCALAPPDATA\meteor-azure"
fi

# Install Meteor
if [ ! -e "$LOCALAPPDATA\.meteor\meteor.bat" ]; then
  echo meteor-azure: Installing Meteor
  curl -L -o meteor.tar.gz "https://packages.meteor.com/bootstrap-link?arch=os.windows.x86_32"
  tar -zxf meteor.tar.gz -C "$LOCALAPPDATA"
  rm meteor.tar.gz
fi

# Generate Meteor build
echo meteor-azure: Building app
npm install --production
cmd //c "$LOCALAPPDATA\.meteor\meteor.bat" build "$LOCALAPPDATA\meteor-azure" --directory
cp .config/azure/web.config "$LOCALAPPDATA\meteor-azure\bundle"

##################################################################################################################################
# Deployment
# ----------

echo Handling node.js deployment.

# 1. KuduSync
if [[ "$IN_PLACE_DEPLOYMENT" -ne "1" ]]; then
  "$KUDU_SYNC_CMD" -v 50 -f "$LOCALAPPDATA\meteor-azure\bundle" -t "$DEPLOYMENT_TARGET" -n "$NEXT_MANIFEST_PATH" -p "$PREVIOUS_MANIFEST_PATH" -i ".git;.hg;.deployment;.config"
  exitWithMessageOnError "Kudu Sync failed"
fi

# 2. Install npm packages
if [ -e "$DEPLOYMENT_TARGET/programs/server/package.json" ]; then
  cd "$DEPLOYMENT_TARGET/programs/server"

  # Ensure JSON tool is installed
  if ! hash json 2>/dev/null; then
    echo meteor-azure: Installing JSON tool
    npm install -g json
  fi

  # Prepare package.json
  echo meteor-azure: Preparing package.json
  json -f package.json -e "this.main='../../main.js';this.scripts={ start: 'node ../../main' }" > temp-package.json
  rm package.json
  cmd //c rename temp-package.json package.json

  echo meteor-azure: Installing NPM packages
  npm install --production
  exitWithMessageOnError "npm failed"
  cd - > /dev/null
fi

##################################################################################################################################
echo "meteor-azure: Finished successfully."
