import { useNetInfo } from '@react-native-community/netinfo';
import * as Network from 'expo-network';
import { getPendingVisits, markVisitsSynced, getPendingCount, setMeta, getMeta, saveDeltaRecords, getPriorityList, syncPendingVisitsToBackend } from './dbService';

const API_BASE = 'http://192.168.1.44:8001/api/v1';

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
  if (isSyncing) return { success: false, reason: 'Already syncing' };
  
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

export async function pullDeltaScores(repId, scoreDate) {
  const isOnline = await checkNetworkStatus();
  if (!isOnline) return { success: false, reason: 'Offline' };
  
  try {
    const response = await fetch(`${API_BASE}/reps/${repId}/priority-list?date=${scoreDate}`, {
      headers: { 'Authorization': 'Bearer agripulse-hackathon-secret-key-2026' }
    });
    if (!response.ok) throw new Error('Failed to fetch scores');
    
    const result = await response.json();
    const records = result.retailers || [];
    
    if (records.length > 0) {
      const recordsWithRep = records.map(r => ({ ...r, rep_id: repId }));
      await saveDeltaRecords(recordsWithRep);
      await setMeta(`last_sync_${repId}`, new Date().toISOString());
    }
    
    return { success: true, count: records.length };
  } catch (error) {
    console.error('[Sync] Pull scores error:', error);
    return { success: false, reason: error.message };
  }
}

export async function fullSync(repId, scoreDate) {
  const results = { visits: null, scores: null };
  
  const visitResult = await syncPendingVisits();
  results.visits = visitResult;
  
  const scoreResult = await pullDeltaScores(repId, scoreDate);
  results.scores = scoreResult;
  
  return results;
}

export async function getLastSyncTime(repId) {
  return await getMeta(`last_sync_${repId}`);
}

export function isSyncInProgress() {
  return isSyncing;
}