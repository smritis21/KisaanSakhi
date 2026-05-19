import * as Network from 'expo-network';
import { getPendingVisits, markVisitsSynced, getPendingCount, setMeta, getMeta, saveDeltaRecords, getPriorityList, syncPendingVisitsToBackend } from './dbService';
import { getApiConfig, getCurrentRepId, getConfig } from './configService';

async function getApiEndpoint() {
  const { baseUrl } = await getApiConfig();
  const repId = await getCurrentRepId();
  return { baseUrl, repId };
}

// Validate URL to prevent SSRF attacks
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Simple UUID generator for React Native
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let isSyncing = false;
let pendingSyncCallback = null;

export function setupSyncListeners(onSyncTriggered) {
  pendingSyncCallback = onSyncTriggered;
}

export async function checkNetworkStatus() {
  const netInfo = await Network.getNetworkStateAsync();
  return netInfo.isConnected;
}

export async function queueVisit(visitData) {
  const visit = {
    queue_id: generateId(),
    ...visitData,
    visit_timestamp: new Date().toISOString(),
    synced: 0,
    created_at: new Date().toISOString(),
  };
  
  const { queueVisit: queueVisitDb } = await import('./dbService');
  await queueVisitDb(visit);
  
  const pending = await getPendingCount();
  if (pendingSyncCallback) pendingSyncCallback(pending);
  
  return visit;
}

export async function syncPendingVisits() {
  if (isSyncing) {
    isSyncing = false; // force reset stuck lock
  }
  
  const isOnline = await checkNetworkStatus();
  if (!isOnline) return { success: false, reason: 'Offline' };
  
  isSyncing = true;
  
  try {
    const result = await syncPendingVisitsToBackend();
    isSyncing = false;
    const pending = await getPendingCount();
    if (pendingSyncCallback) pendingSyncCallback(pending);
    return result;
  } catch (error) {
    console.error('[Sync] Visit sync error:', error);
    isSyncing = false;
    return { success: false, reason: error.message };
  }
}

export async function pullDeltaScores(repId = null, scoreDate = null) {
  const isOnline = await checkNetworkStatus();
  if (!isOnline) return { success: false, reason: 'Offline' };
  
  try {
    const { baseUrl, repId: configRepId } = await getApiEndpoint();
    const targetRepId = repId || configRepId;
    const targetDate = scoreDate || new Date().toISOString().split('T')[0];
    
    const url = `${baseUrl}/reps/${targetRepId}/priority-list?score_date=${targetDate}`;
    
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL detected');
    }
    
    const { token } = await getApiConfig();
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error(`Failed to fetch scores: ${response.status}`);
    
    const result = await response.json();
    const records = result.retailers || [];
    
    if (records.length > 0) {
      const recordsWithRep = records.map(r => ({ ...r, rep_id: targetRepId }));
      await saveDeltaRecords(recordsWithRep);
      await setMeta(`last_sync_${targetRepId}`, new Date().toISOString());
    }
    
    return { success: true, count: records.length };
  } catch (error) {
    // Silently fail — offline or transient error
    return { success: false, reason: error.message };
  }
}

export async function fullSync(repId = null, scoreDate = null) {
  const results = { visits: null, scores: null };
  
  const visitResult = await syncPendingVisits();
  results.visits = visitResult;
  
  const scoreResult = await pullDeltaScores(repId, scoreDate);
  results.scores = scoreResult;
  
  return results;
}

export async function getLastSyncTime(repId = null) {
  const { repId: configRepId } = await getApiEndpoint();
  const targetRepId = repId || configRepId;
  return await getMeta(`last_sync_${targetRepId}`);
}

export function isSyncInProgress() {
  return isSyncing;
}

// Get sync status with dynamic config
export async function getSyncStatus() {
  const config = await getConfig();
  const pending = await getPendingCount();
  const lastSync = await getLastSyncTime();
  
  return {
    isOnline: await checkNetworkStatus(),
    isSyncing,
    pendingCount: pending,
    lastSyncTime: lastSync,
    syncInterval: config?.syncIntervalMinutes || 5,
  };
}