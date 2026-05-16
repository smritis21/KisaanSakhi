# Offline Sync Test Plan

## Critical Offline Test

### Preconditions
- App installed on device/emulator
- Internet connection available
- User logged in as REP_0001

### Test Steps

1. **Enable Airplane Mode**
   - Turn on airplane mode on device
   - Verify sync status shows "Offline" or "🔴 Offline"

2. **Log Retailer Visit**
   - Navigate to Priority List tab
   - Tap any retailer card
   - Tap "📝 Log Visit" button
   - Select outcome (e.g., "Visit Completed")
   - Optionally select product recommended
   - Add notes if needed
   - Tap "💾 Save (Offline)" button
   - Confirm success message

3. **Verify Data Persisted**
   - Close and reopen the app (simulating app restart)
   - Navigate to Priority List
   - Log another visit
   - Check that previous visit data is still in SQLite

4. **Restore Internet**
   - Turn off airplane mode
   - Wait for automatic sync (or tap "Force Sync")
   - Verify pending count goes to 0
   - Verify sync status shows "All Synced"

5. **Validate No Data Loss**
   - Check that all logged visits were successfully synced
   - Verify visit count matches on server

## Expected Results

| Step | Expected Result |
|------|-----------------|
| Airplane mode enabled | Status bar shows offline indicator |
| Visit logged offline | Success message, data saved to SQLite |
| App restart | Previous offline data still accessible |
| Internet restored | Auto-sync triggers, pending count = 0 |
| Server verification | All visits synced, no data loss |

## Validation Checklist

- [ ] SQLite persists data after app restart
- [ ] Offline queue accumulates pending visits
- [ ] Sync recovery succeeds when back online
- [ ] No data loss during sync process
- [ ] Network status correctly detected
- [ ] Visual feedback for offline/online states

## Manual Test Commands

```bash
# Check pending visits in SQLite
adb shell execsu -c "sqlite3 /data/data/$(pkg name)/databases/agripulse.db 'SELECT * FROM visit_queue WHERE synced=0;'"

# View all visits
adb shell execsu -c "sqlite3 /data/data/$(pkg name)/databases/agripulse.db 'SELECT * FROM visit_queue;'"
```

## Automated Test (Jest)

```javascript
describe('Offline Sync', () => {
  it('persists visit when offline', async () => {
    const visit = { retailer_id: 'RET_001', rep_id: 'REP_0001', outcome_code: 'VISIT_COMPLETE' };
    await queueVisit(visit);
    const pending = await getPendingCount();
    expect(pending).toBeGreaterThan(0);
  });

  it('syncs when back online', async () => {
    const result = await syncPendingVisits();
    expect(result.success).toBe(true);
  });
});
```