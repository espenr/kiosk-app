#!/bin/bash

# Deploy script for Kiosk App
echo "Building Kiosk App..."
npm run build

# Variables
TARGET_HOST="raspberrypizerow2.local"
TARGET_USER="pi"
TARGET_DIR="/var/www/kiosk"
LOCAL_DIR="dist/"

# Deploy to Raspberry Pi
echo "Deploying to $TARGET_HOST:$TARGET_DIR..."
rsync -avz --delete $LOCAL_DIR $TARGET_USER@$TARGET_HOST:$TARGET_DIR

# Check deploy status
if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo "The app is now available at http://$TARGET_HOST"
else
  echo "❌ Deployment failed."
  exit 1
fi