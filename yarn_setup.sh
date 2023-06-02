#!/bin/bash
# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
   # If Yarn is not installed, install it
   echo "Yarn not found, installing..."
   npm install -g yarn
fi

# Perform Yarn installation
echo "Installing dependencies with Yarn..."
yarn install
