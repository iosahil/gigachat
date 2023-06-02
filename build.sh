#!/bin/bash

if ! command -v yarn &> /dev/null; then
echo "yarn not found, installing..."
npm install -g yarn
fi

echo "Running yarn install..."
yarn install