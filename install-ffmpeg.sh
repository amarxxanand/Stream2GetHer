#!/bin/bash

# FFmpeg Installation Script for Stream2GetHer

echo "🔍 Checking FFmpeg availability..."

# Check if ffmpeg is installed
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg is already installed"
    ffmpeg -version | head -1
    echo "🎉 Real-time transcoding is ready!"
    exit 0
fi

echo "❌ FFmpeg not found"
echo "🔄 Installing FFmpeg..."

# Detect the operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        echo "📦 Detected Debian/Ubuntu - using apt-get"
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif command -v yum &> /dev/null; then
        # RHEL/CentOS
        echo "📦 Detected RHEL/CentOS - using yum"
        sudo yum install -y epel-release
        sudo yum install -y ffmpeg
    elif command -v dnf &> /dev/null; then
        # Fedora
        echo "📦 Detected Fedora - using dnf"
        sudo dnf install -y ffmpeg
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        echo "📦 Detected Arch Linux - using pacman"
        sudo pacman -S ffmpeg
    else
        echo "❌ Unsupported Linux distribution"
        echo "Please install FFmpeg manually:"
        echo "  - Visit: https://ffmpeg.org/download.html"
        echo "  - Or compile from source"
        exit 1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        echo "📦 Detected macOS - using Homebrew"
        brew install ffmpeg
    else
        echo "❌ Homebrew not found"
        echo "Please install Homebrew first: https://brew.sh"
        echo "Then run: brew install ffmpeg"
        exit 1
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    echo "📦 Detected Windows"
    echo "Please install FFmpeg manually:"
    echo "  1. Download from: https://ffmpeg.org/download.html#build-windows"
    echo "  2. Extract to a folder (e.g., C:\\ffmpeg)"
    echo "  3. Add C:\\ffmpeg\\bin to your PATH environment variable"
    echo "  4. Restart your command prompt/terminal"
    exit 1
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install FFmpeg manually: https://ffmpeg.org/download.html"
    exit 1
fi

# Verify installation
echo ""
echo "🔍 Verifying FFmpeg installation..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg successfully installed!"
    ffmpeg -version | head -1
    echo ""
    echo "🎉 Real-time transcoding is now available!"
    echo "📋 Supported input formats: MKV, AVI, MOV, FLV, WMV"
    echo "📤 Output format: MP4 (H.264 + AAC)"
    echo "⚡ Optimized for real-time streaming"
else
    echo "❌ FFmpeg installation failed"
    echo "Please install FFmpeg manually and try again"
    exit 1
fi
