#!/bin/bash

# Render Build Script for Loma Platform
# Installs system dependencies required for native Node.js modules

set -e  # Exit on error

echo "🔧 Installing system dependencies for native modules..."

# Install build tools and libraries required for canvas (Cairo, Pango, etc.)
# Also install PDF processing tools for CV parser
apt-get update -qq
apt-get install -y --no-install-recommends \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  pkg-config \
  poppler-utils \
  ghostscript \
  tesseract-ocr

echo "✅ System dependencies installed successfully"

# Clean up to reduce image size
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "🧹 Cleanup completed"

