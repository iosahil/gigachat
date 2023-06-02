#!/bin/bash

if ! command -v yarn &> /dev/null; then
echo "yarn not found, installing..."
npm install -g yarn
fi

rm package-lock.json
rm -rf node_modules
echo "Running yarn install..."
yarn install
yarn start