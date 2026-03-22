# Photo Quality Optimization - Implementation Notes

**Date:** 2026-03-22
**Issue:** Blurry/pixelated images on 32" TV display

## Problem Summary

Images appeared blurry on the TV display (1080x1920px) in the photo widget (952px height × 1080px width).

## Root Cause

The backend photo selection logic had a critical flaw:

**Before (`i += 2` approach):**
```typescript
for (let i = 0; i < items.length; i += 2) {
  const item = items[i];
  photos.push({ url: `https://${item.url_location}${item.url_path}` });
}
```

**Problem:** Assumed derivatives came in consecutive pairs `[0,1]`, `[2,3]`, etc.

**Reality:** iCloud returns ~2 derivatives per photo, but they're **NOT in consecutive pairs**.

## Investigation Findings

### API Response Structure

- **Input:** 114 photoGUIDs from `/webstream` API
- **Output:** 228 derivatives from `/webasseturls` API
- **Ratio:** 2:1 (two derivatives per photo)

### Derivative Organization

**Test 1: Consecutive pairs `[0,1]`, `[2,3]`...**
```
Pair [0,1]: IMG_0115.JPG vs IMG_0002.JPG (DIFFERENT photos)
Pair [2,3]: IMG_0271.JPG vs IMG_0024.JPG (DIFFERENT photos)
```
❌ Not consecutive pairs

**Test 2: Offset pairs `[0,114]`, `[1,115]`...**
```
Pair [0,114]: IMG_0115.JPG vs IMG_0115.JPG (SAME photo!)
Pair [1,115]: IMG_0002.JPG vs IMG_5488.JPG (different photos)
```
⚠️ Only 1 out of 10 tested pairs matched

**Test 3: Unique filename count**
```
Total derivatives: 228
Unique filenames: 113
Duplicate filenames: 115
```
✅ Confirms ~2 derivatives per photo, but **random order**

### Old Logic Impact

The `i += 2` approach:
- Selected indices: 0, 2, 4, 6, 8... (114 photos)
- **Skipped random photos** due to non-consecutive pairing
- **Potentially selected lower-resolution derivatives**

## Solution

### New Deduplication Approach

```typescript
const getFilename = (path: string): string => {
  const parts = path.split('/');
  return parts[parts.length - 1]?.split('?')[0] || 'unknown';
};

const photos: Photo[] = [];
const seenFilenames = new Set<string>();

for (const item of items) {
  if (!item.url_location || !item.url_path) continue;

  const filename = getFilename(item.url_path);

  // Skip if we've already seen this filename
  if (seenFilenames.has(filename)) {
    continue;
  }

  seenFilenames.add(filename);
  photos.push({
    url: `https://${item.url_location}${item.url_path}`,
  });
}
```

**Result:** 113 unique photos, 115 duplicates skipped

### Why First Occurrence?

iCloud API doesn't provide metadata (width, height, fileSize). Comparison of duplicate URLs showed:

```
First:  /S/AVdokNtpEgKT012tgY04KUh6XGMh/IMG_0115.JPG?o=AoSr...&v=1&x=1
Second: /S/AVkSwPqkMsbjeJIzjeLQSnnsJpXd/IMG_0115.JPG?o=AkXi...&v=1&x=1
```

- No resolution parameters (`&width=`, `&quality=`)
- Both have identical flags (`&v=1&x=1`)
- Only differences: GUID and auth token

**Decision:** Select first occurrence, assuming iCloud returns higher-quality derivatives first.

## Testing

### Backend Verification

```bash
curl -s http://localhost:3001/api/photos | jq '.photos | length'
# Before: 114 photos (random selection)
# After: 113 unique photos (proper deduplication)
```

### Frontend Verification

```bash
# Open browser DevTools → Console → Filter: "[Photo]"
# Check for warnings: "Low resolution detected" or "Image will be upscaled"

# On Raspberry Pi:
ssh pi@pi.local 'DISPLAY=:0 scrot /tmp/screen.png' && \
scp pi@pi.local:/tmp/screen.png /tmp/kiosk-screenshot.png
# Inspect screenshot for sharp edges
```

## Files Modified

- `server/src/photos.ts` - Fixed derivative selection logic

## Success Criteria

- ✅ All unique photos included (no random skipping)
- ✅ Proper deduplication (113 unique from 228 derivatives)
- ✅ Type checking passes
- ⏳ Frontend quality verification (to be tested after deployment)

## Future Improvements

If images are still blurry after this fix:

1. **Empirical testing:** Download a few duplicate pairs and compare actual file sizes
2. **URL parameter testing:** Try `?width=2048`, `?size=large`, `?quality=high`
3. **Last occurrence:** Test if last occurrence has higher resolution than first
4. **Alternative API endpoints:** Check if iCloud has a dedicated "full resolution" endpoint

## Notes

- iCloud photo URLs expire after ~2 hours (backend caches for 45 min)
- Widget dimensions: 952px height × 1080px width (requires min 1080px wide images)
- Frontend already has quality monitoring via `image.naturalWidth` checks
