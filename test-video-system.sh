#!/bin/bash

# Test script to verify video streaming and transcoding

echo "🧪 Testing Stream2GetHer Video System"
echo "======================================"

SERVER_URL="http://localhost:3000"

# Test 1: Check server health
echo "1. Testing server health..."
if curl -s "${SERVER_URL}/api/health" > /dev/null; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not responding"
    exit 1
fi

# Test 2: Test MP4 video info
echo ""
echo "2. Testing MP4 video info..."
MP4_URL="https://drive.google.com/file/d/1O0O9ygNj_IRGWSKgX79BaUK53Mj1ux18/view?usp=sharing"
MP4_RESPONSE=$(curl -s "${SERVER_URL}/api/video/info?url=${MP4_URL}")
echo "   Response: $MP4_RESPONSE"

if echo "$MP4_RESPONSE" | grep -q '"needsTranscoding":false'; then
    echo "   ✅ MP4 correctly identified as not needing transcoding"
else
    echo "   ⚠️  MP4 transcoding detection may be incorrect"
fi

# Test 3: Test MKV video info
echo ""
echo "3. Testing MKV video info..."
MKV_URL="https://drive.google.com/file/d/1yC80q886ohkEuNqPqhtWLjMZvnmnOtRt/view?usp=sharing"
MKV_RESPONSE=$(curl -s "${SERVER_URL}/api/video/info?url=${MKV_URL}")
echo "   Response: $MKV_RESPONSE"

if echo "$MKV_RESPONSE" | grep -q '"needsTranscoding":true'; then
    echo "   ✅ MKV correctly identified as needing transcoding"
else
    echo "   ⚠️  MKV transcoding detection may be incorrect"
fi

# Test 4: Test MP4 streaming (first few bytes)
echo ""
echo "4. Testing MP4 streaming..."
MP4_STREAM_URL="${SERVER_URL}/api/video/stream?url=${MP4_URL}"
if curl -s -r 0-1023 "$MP4_STREAM_URL" | file - | grep -q "video\|MP4\|media"; then
    echo "   ✅ MP4 streaming returns video data"
else
    echo "   ⚠️  MP4 streaming may have issues"
fi

# Test 5: Test MKV transcoding (first few bytes)
echo ""
echo "5. Testing MKV transcoding..."
MKV_TRANSCODE_URL="${SERVER_URL}/api/video/transcode?url=${MKV_URL}"
echo "   Starting transcoding test (this may take a few seconds)..."

# Get just the headers first
TRANSCODE_HEADERS=$(curl -I -s "$MKV_TRANSCODE_URL")
echo "   Headers: $TRANSCODE_HEADERS"

if echo "$TRANSCODE_HEADERS" | grep -q "Content-Type: video/mp4"; then
    echo "   ✅ MKV transcoding returns MP4 content type"
else
    echo "   ⚠️  MKV transcoding content type may be incorrect"
fi

if echo "$TRANSCODE_HEADERS" | grep -q "X-Transcoded: true"; then
    echo "   ✅ MKV transcoding header indicates transcoding is active"
else
    echo "   ⚠️  MKV transcoding header missing"
fi

# Test 6: FFmpeg availability
echo ""
echo "6. Testing FFmpeg availability..."
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ FFmpeg is available on system"
    ffmpeg -version | head -1
else
    echo "   ❌ FFmpeg is not available - transcoding will not work"
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "💡 If videos are still failing:"
echo "   1. Check browser developer console for detailed errors"
echo "   2. Verify Google Drive links are publicly accessible"
echo "   3. Check network connectivity"
echo "   4. Try refreshing the browser page"
