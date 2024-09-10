#!/bin/sh

# Get the Ubuntu version
UBUNTU_VERSION=$(lsb_release -rs)

# Determine the Node.js major version based on Ubuntu version
if [ "$(echo "$UBUNTU_VERSION <= 18.04" | bc)" -eq 1 ]; then
    NODE_MAJOR=16
else
    NODE_MAJOR=18
fi
echo "Installing Node version: $NODE_MAJOR"

# Update and install necessary packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Setup NodeSource keyring and sources list
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# Add NodeSource repository
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Update package list and install Node.js
sudo apt-get update
sudo apt-get install -y nodejs
