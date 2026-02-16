#!/bin/bash
#
# Sync photos from iCloud Shared Album
# Fetches photo URLs from iCloud's undocumented SharedStreams API and saves to JSON
#
# Usage: ./sync-photos.sh
# Requires: ICLOUD_ALBUM_URL environment variable or .env file
#
# Run via cron: 0 * * * * /var/www/kiosk/scripts/sync-photos.sh >> /var/log/kiosk-photos.log 2>&1

set -e

# Directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Output to public/ for local dev (Vite), or project root for Pi deployment
if [ -d "$PROJECT_DIR/public" ]; then
    OUTPUT_FILE="$PROJECT_DIR/public/photos.json"
else
    OUTPUT_FILE="$PROJECT_DIR/photos.json"
fi

# Load environment variables from .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Check for album URL
if [ -z "$ICLOUD_ALBUM_URL" ]; then
    echo "Error: ICLOUD_ALBUM_URL not set"
    echo "Set it in .env file or environment variable"
    echo "Example: ICLOUD_ALBUM_URL=https://www.icloud.com/sharedalbum/#B12abc123xyz"
    exit 1
fi

# Extract token from URL (format: https://www.icloud.com/sharedalbum/#TOKEN)
TOKEN=$(echo "$ICLOUD_ALBUM_URL" | sed -n 's/.*#\(.*\)/\1/p')

if [ -z "$TOKEN" ]; then
    echo "Error: Could not extract token from URL"
    exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting photo sync"
echo "Token: ${TOKEN:0:10}..."

# Calculate partition from first character of token
# Apple encodes the partition in base36: A=10, B=11, ..., Z=35, 0-9=0-9
FIRST_CHAR="${TOKEN:0:1}"
case "$FIRST_CHAR" in
    [0-9]) PARTITION=$FIRST_CHAR ;;
    [A-Z]) PARTITION=$(printf '%d' "'$FIRST_CHAR"); PARTITION=$((PARTITION - 55)) ;;
    [a-z]) PARTITION=$(printf '%d' "'$FIRST_CHAR"); PARTITION=$((PARTITION - 87)) ;;
    *) PARTITION=1 ;;
esac

# Clamp to reasonable range (1-99)
if [ "$PARTITION" -lt 1 ] || [ "$PARTITION" -gt 99 ]; then
    PARTITION=1
fi

echo "Initial partition guess: $PARTITION"

BASE_URL="https://p${PARTITION}-sharedstreams.icloud.com/${TOKEN}/sharedstreams"

# Step 1: Get photo metadata from webstream
echo "Fetching photo metadata..."
WEBSTREAM_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"streamCtag":null}' \
    "$BASE_URL/webstream")

# Check if we got a redirect to a different partition
if echo "$WEBSTREAM_RESPONSE" | grep -q '"X-Apple-MMe-Host"'; then
    NEW_HOST=$(echo "$WEBSTREAM_RESPONSE" | grep -o '"X-Apple-MMe-Host":"[^"]*"' | sed 's/"X-Apple-MMe-Host":"//g' | sed 's/"//g')
    echo "Redirected to: $NEW_HOST"
    BASE_URL="https://${NEW_HOST}/${TOKEN}/sharedstreams"

    # Retry with correct host
    WEBSTREAM_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"streamCtag":null}' \
        "$BASE_URL/webstream")
fi

# Check if we got a valid response
if echo "$WEBSTREAM_RESPONSE" | grep -q '"photos"'; then
    echo "Got photo metadata"
else
    echo "Error: Invalid webstream response"
    echo "$WEBSTREAM_RESPONSE"
    exit 1
fi

# Extract photo GUIDs (UUIDs) from webstream response
# Format: "photoGuid": "UUID"
PHOTO_GUIDS=$(echo "$WEBSTREAM_RESPONSE" | grep -o '"photoGuid":"[^"]*"' | sed 's/"photoGuid":"//g' | sed 's/"//g')

if [ -z "$PHOTO_GUIDS" ]; then
    echo "No photos found in album"
    echo "[]" > "$OUTPUT_FILE"
    exit 0
fi

# Count photos
PHOTO_COUNT=$(echo "$PHOTO_GUIDS" | wc -l | tr -d ' ')
echo "Found $PHOTO_COUNT photos"

# Build JSON array of photoGuids for webasseturls request
GUIDS_JSON="["
FIRST=true
for GUID in $PHOTO_GUIDS; do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        GUIDS_JSON+=","
    fi
    GUIDS_JSON+="\"$GUID\""
done
GUIDS_JSON+="]"

# Step 2: Get download URLs for photos
echo "Fetching download URLs..."
URLS_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"photoGuids\":$GUIDS_JSON}" \
    "$BASE_URL/webasseturls")

# Check response
if echo "$URLS_RESPONSE" | grep -q '"items"'; then
    echo "Got download URLs"
else
    echo "Error: Invalid webasseturls response"
    echo "$URLS_RESPONSE"
    exit 1
fi

# Parse response and build photo URLs
# Response format: { "items": { "checksum": { "url_location": "...", "url_path": "..." }, ... } }
# Full URL is: https://{url_location}{url_path}
# We get multiple derivatives per photo (different sizes), pick the largest ones

# Extract URL data - each photo has multiple derivatives, we want the largest
# url_location and url_path appear in pairs for each derivative
URL_LOCATIONS=$(echo "$URLS_RESPONSE" | grep -o '"url_location":"[^"]*"' | sed 's/"url_location":"//g' | sed 's/"//g')
URL_PATHS=$(echo "$URLS_RESPONSE" | grep -o '"url_path":"[^"]*"' | sed 's/"url_path":"//g' | sed 's/"//g')

# Convert to arrays
IFS=$'\n' read -d '' -r -a LOCATIONS_ARR <<< "$URL_LOCATIONS" || true
IFS=$'\n' read -d '' -r -a PATHS_ARR <<< "$URL_PATHS" || true

# Build output JSON array - take every other URL (larger size derivative)
# The API returns 2 derivatives per photo: thumbnail and full size
# We want the full size ones (usually the first of each pair based on the larger checksum fileSize)
echo "[" > "$OUTPUT_FILE.tmp"
FIRST=true
ADDED=0

# We have 2 derivatives per photo, so step by 2 and take index 0 (usually the larger one)
TOTAL_URLS=${#LOCATIONS_ARR[@]}
for ((i=0; i<TOTAL_URLS; i+=2)); do
    if [ -n "${LOCATIONS_ARR[$i]}" ] && [ -n "${PATHS_ARR[$i]}" ]; then
        FULL_URL="https://${LOCATIONS_ARR[$i]}${PATHS_ARR[$i]}"

        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$OUTPUT_FILE.tmp"
        fi

        # Write JSON object with url
        echo "  {\"url\": \"$FULL_URL\"}" >> "$OUTPUT_FILE.tmp"
        ADDED=$((ADDED + 1))
    fi
done

echo "" >> "$OUTPUT_FILE.tmp"
echo "]" >> "$OUTPUT_FILE.tmp"

# Move temp file to final location
mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Sync complete: $ADDED photo URLs saved to $OUTPUT_FILE"
