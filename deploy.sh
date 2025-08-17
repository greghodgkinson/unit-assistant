#!/bin/bash

# Docker deployment script for Mac using Podman
# This script builds and runs the learning assistant application

set -e  # Exit on any error

# Configuration
IMAGE_NAME="unit-assistant"
CONTAINER_NAME="unit-assistant-app"
PORT="3001"
STORAGE_DIR="$HOME/.learning-assistant"
PODMAN_ROOT="$HOME/.local/share/containers/storage"

echo "🚀 Starting deployment of Unit Assistant..."

# Create storage directory if it doesn't exist
echo "📁 Setting up storage directory..."
if [ ! -d "$STORAGE_DIR" ]; then
    echo "   Creating storage directory: $STORAGE_DIR"
    mkdir -p "$STORAGE_DIR"
else
    echo "   Storage directory already exists: $STORAGE_DIR"
fi

# Ensure podman storage root exists
mkdir -p "$PODMAN_ROOT"

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Error: Podman is not installed. Please install podman first."
    echo "   You can install it with: brew install podman"
    exit 1
fi

# Stop and remove existing container if it exists
echo "🛑 Stopping existing container (if running)..."
if podman --root="$PODMAN_ROOT" ps -q -f name=$CONTAINER_NAME | grep -q .; then
    echo "   Stopping container: $CONTAINER_NAME"
    podman --root="$PODMAN_ROOT" stop $CONTAINER_NAME
fi

if podman --root="$PODMAN_ROOT" ps -a -q -f name=$CONTAINER_NAME | grep -q .; then
    echo "   Removing container: $CONTAINER_NAME"
    podman --root="$PODMAN_ROOT" rm $CONTAINER_NAME
fi

# Build the Docker image
echo "🔨 Building Docker image: $IMAGE_NAME"
podman --root="$PODMAN_ROOT" build -t $IMAGE_NAME .

# Run the new container
echo "🏃 Starting new container..."
podman --root="$PODMAN_ROOT" run -d \
    --name $CONTAINER_NAME \
    -p $PORT:3001 \
    -v "$STORAGE_DIR:/app/storage" \
    --restart unless-stopped \
    $IMAGE_NAME

# Check if container is running
sleep 2
if podman --root="$PODMAN_ROOT" ps -q -f name=$CONTAINER_NAME | grep -q .; then
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at: http://localhost:3001"
    echo "📊 Container status:"
    podman --root="$PODMAN_ROOT" ps -f name=$CONTAINER_NAME
else
    echo "❌ Deployment failed! Container is not running."
    echo "📋 Container logs:"
    podman --root="$PODMAN_ROOT" logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo "🔧 Useful commands:"
echo "   View logs:    podman --root=\"$PODMAN_ROOT\" logs $CONTAINER_NAME"
echo "   Stop app:     podman --root=\"$PODMAN_ROOT\" stop $CONTAINER_NAME"
echo "   Restart app:  podman --root=\"$PODMAN_ROOT\" restart $CONTAINER_NAME"
echo "   Remove app:   podman --root=\"$PODMAN_ROOT\" rm -f $CONTAINER_NAME"
