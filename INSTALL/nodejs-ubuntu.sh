#!/bin/sh

# Get the Ubuntu version
UBUNTU_VERSION=$(lsb_release -rs)
NODE_MAJOR=18

# Check if Ubuntu version is 18.04
if [ "$UBUNTU_VERSION" = "18.04" ]; then
    NODE_MAJOR=16
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
