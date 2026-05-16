import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory storage for visit queue (syncs to PostgreSQL backend)
let visitQueue = [];
let retailers = [];
let lastSyncTime = null;

const API_BASE = 'http://192.168.1.44:8001/api/v1';

export async function initDb() {
  try {
    // Load existing queue from AsyncStorage
    const storedQueue = await AsyncStorage.getItem('visit_queue');
    if (storedQueue) {
      visitQueue = JSON.parse(storedQueue);
    }
    
    // Load retailers from AsyncStorage
    const storedRetailers = await AsyncStorage.getItem('retailers');
    if (storedRetailers) {
      retailers = JSON.parse(storedRetailers);
    }
    
    const storedSync = await AsyncStorage.getItem('last_sync');
    if (storedSync) {
      lastSyncTime = storedSync;
    }
    
    console.log('[DB] Storage initialized, queue size:', visitQueue.length, 'retailers:', retailers.length);
  } catch (e) {
    console.log('[DB] Init error:', e.message);
  }
}

export async function saveDeltaRecords(records) {
  await initDb();
  
  // Store retailers in AsyncStorage
  retailers = records;
  await AsyncStorage.setItem('retailers', JSON.stringify(retailers));
  
  console.log('[DB] Stored', records.length, 'retailers');
  return records.length;
}

export async function getPriorityList(repId, scoreDate) {
  await initDb();
  return retailers;
}

export async function queueVisit(visit) {
  await initDb();
  
  const visitRecord = {
    queue_id: visit.queue_id,
    retailer_id: visit.retailer_id,
    rep_id: visit.rep_id,
    visit_timestamp: visit.visit_timestamp,
    outcome_code: visit.outcome_code,
    product_recommended: visit.product_recommended,
    notes: visit.notes,
    synced: 0,
    created_at: new Date().toISOString(),
  };
  
  visitQueue.push(visitRecord);
  await AsyncStorage.setItem('visit_queue', JSON.stringify(visitQueue));
  
  console.log('[DB] Visit queued locally, total:', visitQueue.length);
}

export async function getPendingVisits() {
  await initDb();
  return visitQueue.filter(v => v.synced === 0);
}

export async function getAllVisits() {
  await initDb();
  return visitQueue;
}

export async function markVisitsSynced(queueIds) {
  await initDb();
  
  visitQueue = visitQueue.map(v => {
    if (queueIds.includes(v.queue_id)) {
      return { ...v, synced: 1 };
    }
    return v;
  });
  
  await AsyncStorage.setItem('visit_queue', JSON.stringify(visitQueue));
  console.log('[DB] Marked', queueIds.length, 'visits as synced');
}

export async function getPendingCount() {
  await initDb();
  return visitQueue.filter(v => v.synced === 0).length;
}

export async function getMeta(key) {
  if (key === 'last_sync_REP_0001') {
    return lastSyncTime;
  }
  return null;
}

export async function setMeta(key, value) {
  if (key === 'last_sync_REP_0001') {
    lastSyncTime = value;
    await AsyncStorage.setItem('last_sync', value);
  }
}

// Sync visits to PostgreSQL backend
export async function syncPendingVisitsToBackend() {
  const pending = visitQueue.filter(v => v.synced === 0);
  
  if (pending.length === 0) {
    return { success: true, synced: 0 };
  }
  
  try {
    const response = await fetch(`${API_BASE}/sync/visits`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer agripulse-hackathon-secret-key-2026'
      },
      body: JSON.stringify({ visits: pending }),
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const result = await response.json();
    
    // Mark as synced locally
    await markVisitsSynced(pending.map(v => v.queue_id));
    
    console.log('[DB] Synced', pending.length, 'visits to backend');
    return { success: true, synced: pending.length };
  } catch (error) {
    console.log('[DB] Sync error:', error.message);
    return { success: false, reason: error.message };
  }
}