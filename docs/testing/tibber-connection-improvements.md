# Tibber Connection Improvements Testing Guide

## Overview

Implemented Phase 1 fixes to improve Tibber WebSocket connection reliability and reduce TV wake recovery time.

**Commit:** 8c21284f - "Improve Tibber connection reliability and reduce TV wake recovery time"

## Changes Summary

### Phase 1.1: Explicit Reconnection on Page Visibility ✅

**Goal:** Reduce TV wake recovery time from 30-60s → <5s

**Implementation:**
- Modified `useServiceRecovery.ts` to accept Tibber connection reference
- Exposed connection reference from `useLiveMeasurement.ts`
- Store connection ref globally in `Electricity.tsx` via `window.__tibberConnectionRef`
- `App.tsx` retrieves ref and passes to `useServiceRecovery`
- On page visibility (TV wake), explicitly call `forceReconnect()`

**Expected Behavior:**
```
[PageVisibility] Page visible (was hidden for 30s)
[ServiceRecovery] Checking services after visibility change...
[ServiceRecovery] Triggering Tibber reconnection after wake  // NEW
[Tibber] Force reconnecting due to stale data
[Tibber] State: data_flowing → stale (data stale, forcing reconnect)
```

### Phase 1.2: Increased State Timeouts ✅

**Goal:** Reduce false timeout triggers on slow networks/API load

**Changes:**
- `CONNECTING` state: 15s → 25s (WebSocket establishment)
- `OPEN` state: 15s → 25s (authentication/connection_ack)
- `SUBSCRIBED` state: 30s → 40s (first data arrival)

**Rationale:**
- Gives Tibber API more time to respond during server load
- Reduces timeout-induced reconnections
- Total timeout worst case: 90s (still reasonable for error detection)

### Phase 1.3: Enhanced Connection Failure Logging ✅

**Goal:** Better diagnostics for connection issues

**Implementation:**
- Log connection failures with attempt counter and next backoff delay
- Format: `[Tibber] Connection failed: <reason>, attempt #<N>, next delay: <X>ms`

**Example Output:**
```
[Tibber] State: connecting → error (timeout in connecting)
[Tibber] Connection failed: timeout in connecting, attempt #2, next delay: 2000ms
[Tibber] State: error → disconnected (WebSocket closed)
[Tibber] Connection failed: WebSocket closed, attempt #2, next delay: 2000ms
```

## Testing Instructions

### Test 1: TV Wake Recovery (Primary Issue)

**Purpose:** Verify explicit reconnection reduces recovery time

**Steps:**
1. Deploy to Pi: `npm run deploy`
2. Take baseline screenshot: `ssh pi@pi.local 'DISPLAY=:0 scrot /tmp/screen.png' && scp pi@pi.local:/tmp/screen.png /tmp/kiosk-before.png`
3. Lock screen (simulate TV sleep): `ssh pi@pi.local 'DISPLAY=:0 xset dpms force off'`
4. Wait 30 seconds
5. Unlock screen (simulate TV wake): `ssh pi@pi.local 'DISPLAY=:0 xset dpms force on'`
6. Wait 10 seconds (should reconnect in <5s)
7. Take screenshot: `ssh pi@pi.local 'DISPLAY=:0 scrot /tmp/screen.png' && scp pi@pi.local:/tmp/screen.png /tmp/kiosk-after.png`
8. Verify electricity widget shows fresh data (not stale/error)

**Check Browser Console:**
```bash
# Access browser console via remote debugging (if enabled)
# Look for these log patterns:
[PageVisibility] Page visible (was hidden for 30s)
[ServiceRecovery] Triggering Tibber reconnection after wake
[Tibber] Force reconnecting due to stale data
[Tibber] State: data_flowing → stale
[Tibber] State: stale → connecting
[Tibber] State: connecting → open (WebSocket opened)
[Tibber] State: open → subscribed (connection_ack received)
[Tibber] State: subscribed → data_flowing (first measurement received)
```

**Expected Result:**
- Recovery time: <5 seconds (vs 30-60s before)
- Electricity widget shows current power consumption
- Connection indicator: green dot

### Test 2: Monitor Connection Stability (24 Hours)

**Purpose:** Verify increased timeouts reduce false reconnections

**Steps:**
1. Deploy to Pi
2. Let run for 24 hours
3. Check browser console logs for connection failure patterns

**Good Indicators:**
- Low reconnection attempt counters (<5)
- No timeout-induced errors during normal operation
- Successful data flow for long periods

**Bad Indicators:**
- High reconnection attempt counters (>10)
- Repeated timeout errors
- Backoff delays at max (30s) frequently

**Check Logs:**
```bash
# SSH into Pi and check systemd logs
ssh pi@pi.local
journalctl --since "24 hours ago" | grep -i tibber | grep -i "Connection failed"

# Count failures
journalctl --since "24 hours ago" | grep -i tibber | grep -i "Connection failed" | wc -l
```

### Test 3: Connection Failure Diagnostics

**Purpose:** Verify enhanced logging helps diagnose issues

**Steps:**
1. Simulate network issues (disconnect Pi ethernet briefly)
2. Check browser console for detailed failure logs
3. Verify log format includes attempt counter and next delay

**Expected Logs:**
```
[Tibber] Connection failed: WebSocket error, attempt #1, next delay: 1000ms
[Tibber] Connection failed: timeout in connecting, attempt #2, next delay: 2000ms
[Tibber] Connection failed: timeout in open, attempt #3, next delay: 4000ms
```

## Success Criteria

### Phase 1.1 Success:
- ✅ TV wake recovery time <5 seconds (vs 30-60s before)
- ✅ Console shows explicit "Triggering Tibber reconnection" message
- ✅ Electricity widget displays current data after wake

### Phase 1.2 Success:
- ✅ Fewer timeout-induced reconnections during 24h monitoring
- ✅ Connection stays stable during normal operation
- ✅ No false timeouts during API slowdowns

### Phase 1.3 Success:
- ✅ Connection failures logged with attempt counter
- ✅ Next backoff delay visible in logs
- ✅ Easier to diagnose connection patterns

## Known Issues / Edge Cases

### Global Window Variable
- Using `window.__tibberConnectionRef` to pass connection ref between components
- Not ideal architecture, but pragmatic for quick fix
- Consider Context API refactor if adding more global state

### Reconnection Counter Reset
- Counter resets on successful subscription (tibber.ts:376)
- If never succeeding, counter never resets
- Max backoff: 30s (reasonable for persistent issues)

### TV Sleep/Wake Timing
- Pi screen may take 1-2s to wake after HDMI CEC command
- Browser visibility event fires when screen actually wakes
- Total recovery includes screen wake time + Tibber reconnect time

## Rollback Plan

If issues arise, revert commit:
```bash
git revert 8c21284f
npm run build
npm run deploy
```

Or disable specific phases by editing code:

**Disable Phase 1.1 (explicit reconnect):**
```typescript
// src/hooks/useServiceRecovery.ts
// Comment out force reconnect:
// if (tibberConnection) {
//   console.log('[ServiceRecovery] Triggering Tibber reconnection after wake');
//   tibberConnection.forceReconnect();
// }
```

**Revert Phase 1.2 (timeouts):**
```typescript
// src/services/tibber.ts
// Change back to original timeouts:
const timeouts = {
  [ConnectionState.CONNECTING]: 15000,
  [ConnectionState.OPEN]: 15000,
  [ConnectionState.SUBSCRIBED]: 30000,
};
```

**Disable Phase 1.3 (logging):**
```typescript
// src/services/tibber.ts
// Comment out logging block in transitionToState()
```

## Next Steps (Phase 2 - Only If Issues Persist)

### Phase 2.1: Connection Metrics Widget
- Add reconnection counter to electricity widget UI
- Display last successful connection time
- Show current backoff delay
- Purpose: User visibility into connection health

### Phase 2.2: Backoff Reset After Sustained Success
- Reset reconnection counter after 5 minutes of stable connection
- Prevents getting stuck in high backoff after transient issues
- Requires timer management in TibberLiveConnection

### Phase 2.3: Throttling Detection
- Detect pattern of repeated failures (5 failures in 2 minutes)
- Show clear message: "Tibber API temporarily unavailable"
- Reduce reconnection frequency when throttling detected

## Documentation Updates

- ✅ CLAUDE.md: Updated Layer 4 (Page Visibility Recovery) section
- ✅ CLAUDE.md: Added "Recent Improvements" note
- ✅ This testing guide created

## Related Files

**Modified:**
- `src/services/tibber.ts` - Timeouts + logging
- `src/hooks/useServiceRecovery.ts` - Accept Tibber connection ref
- `src/hooks/useLiveMeasurement.ts` - Expose connection ref
- `src/components/sections/Electricity/Electricity.tsx` - Store ref globally
- `src/App.tsx` - Pass Tibber ref to useServiceRecovery
- `CLAUDE.md` - Document improvements

**Related Documentation:**
- `/docs/architecture/automatic-error-recovery.md` - Error recovery overview
- `/CLAUDE.md` - Automatic Error Recovery section
- `/docs/plans/kiosk-redesign.md` - Original implementation plan
