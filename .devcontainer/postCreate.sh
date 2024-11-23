#/bin/env bash

# Change ownership of the workspace to the developer user
sudo chown -hR developer:developer /workspaces

# Install node modules
npm ci

# Add the CryowalaCore python whl
cp /artifacts/python/*.whl ./public/
