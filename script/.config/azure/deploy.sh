#!/bin/bash

# ----------------------
# KUDU Deployment Script
# Version: 1.0.6
# ----------------------

# Helpers
# ----------

exitWithMessageOnError () {
  if [ ! $? -eq 0 ]; then
    echo "An error has occurred during web site deployment."
    echo $1
    exit 1
  fi
}

# Prerequisites
# ----------

# Verify node.js installed
hash node 2>/dev/null
exitWithMessageOnError "Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment."

# Setup
# ----------

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

##################################################################################################################################

# Compilation
# ----------

# Install Meteor
if [ ! -d "$LOCALAPPDATA/.meteor" ]; then
  curl -L -o meteor.tar.gz "https://packages.meteor.com/bootstrap-link?arch=os.windows.x86_32"
  tar -zxf meteor.tar.gz -C "$LOCALAPPDATA"
  rm meteor.tar.gz
fi

# Install Underscore CLI
if ! hash underscore 2>/dev/null; then
  cmd //c "$LOCALAPPDATA\.meteor\meteor.bat" npm install -g underscore-cli
fi

# Generate Meteor build
cmd //c "$LOCALAPPDATA\.meteor\meteor.bat" npm install --production
cmd //c "$LOCALAPPDATA\.meteor\meteor.bat" build "$DEPLOYMENT_TEMP" --directory

# Add IIS config
cp .config/azure/web.config "$DEPLOYMENT_TEMP\bundle"

# Add entry-point
cd "$DEPLOYMENT_TEMP\bundle\programs\server"
underscore -i package.json extend "{ main: '../../main.js', scripts: { start: 'node ../../main' } }" -o temp-package.json
rm package.json
cmd //c rename temp-package.json package.json

# Deployment
# ----------

echo Handling node.js deployment.

# 1. KuduSync
if [[ "$IN_PLACE_DEPLOYMENT" -ne "1" ]]; then
  "$KUDU_SYNC_CMD" -v 50 -f "$DEPLOYMENT_TEMP\bundle" -t "$DEPLOYMENT_TARGET" -n "$NEXT_MANIFEST_PATH" -p "$PREVIOUS_MANIFEST_PATH" -i ".git;.hg;.deployment;.config"
  exitWithMessageOnError "Kudu Sync failed"
fi

# 2. Install npm packages
if [ -e "$DEPLOYMENT_TARGET/programs/server/package.json" ]; then
  cd "$DEPLOYMENT_TARGET/programs/server"
  cmd //c "$LOCALAPPDATA\.meteor\meteor.bat" npm install --production
  exitWithMessageOnError "npm failed"
  cd - > /dev/null
fi

##################################################################################################################################

# Post deployment stub
if [[ -n "$POST_DEPLOYMENT_ACTION" ]]; then
  POST_DEPLOYMENT_ACTION=${POST_DEPLOYMENT_ACTION//\"}
  cd "${POST_DEPLOYMENT_ACTION_DIR%\\*}"
  "$POST_DEPLOYMENT_ACTION"
  exitWithMessageOnError "post deployment action failed"
fi

echo "Finished successfully."
