import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getPendingCount, getAllRetailers } from '../services/dbService';
import { syncPendingVisits, checkNetworkStatus, pullDeltaScores } from '../services/syncService';
import { 
  getConfig, 
  getApiConfig, 
  getCurrentRepId, 
  getThresholds,
  getDisplayName,
  initializeConfigService 
} from '../services/configService';

const statusColors = {
  URGENT_RESTOCK: '#F44336',
  OVERDUE_HIGH: '#E91E63',
  INVESTIGATE_SPIKE: '#9C27B0',
  OVERDUE_VISIT: '#FF9800',
  ANOMALY_ALERT: '#FF5722',
  STANDARD_VISIT: '#2196F3',
  LOW_PRIORITY: '#4CAF50',
  synced: '#4CAF50',
  pending: '#FF9800',
  alert: '#F44336',
};

function RetailerCard({ retailer, displayName }) {
  const color = statusColors[retailer.action_code] || '#888';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.retailerName}>{retailer.retailer_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: color }]}>
          <Text style={styles.statusText}>{retailer.action_code}</Text>
        </View>
      </View>
      <Text style={styles.location}>📍 {retailer.tehsil}, {retailer.district}</Text>
      <Text style={styles.score}>Opportunity Score: {(retailer.opportunity_score * 100).toFixed(1)}%</Text>
      {retailer.top_reason_text && (
        <Text style={styles.reason}>"{retailer.top_reason_text}"</Text>
      )}
      <Text style={styles.action}>🎯 {retailer.action_label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const netInfo = useNetInfo();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState(null);
  const [repId, setRepId] = useState('REP_0001');
  const [isOnline, setIsOnline] = useState(false);

  const loadFromStorage = useCallback(async () => {
    try {
      const storedRetailers = await getAllRetailers();
      if (storedRetailers && storedRetailers.length > 0) {
        setRetailers(storedRetailers);
        setLastSync('From cache');
        return true;
      }
    } catch (err) {
      console.warn('[Dashboard] Storage load error:', err);
    }
    return false;
  }, []);

  const loadFromAPI = useCallback(async () => {
    try {
      await initializeConfigService();
      const cfg = await getConfig();
      setConfig(cfg);
      
      const currentRepId = await getCurrentRepId();
      setRepId(currentRepId);
      
      const { baseUrl, token } = await getApiConfig();
      const scoreDate = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${baseUrl}/reps/${currentRepId}/priority-list?score_date=${scoreDate}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const retailerList = data.retailers || [];
      setRetailers(retailerList);
      // Save to AsyncStorage for offline use
      const { saveDeltaRecords } = await import('../services/dbService');
      if (retailerList.length > 0) await saveDeltaRecords(retailerList);
      setLastSync(new Date().toLocaleTimeString());
      setError(null);
      return true;
    } catch (err) {
      console.warn('[Dashboard] API load error:', err);
      return false;
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const online = await checkNetworkStatus();
    setIsOnline(online);
    
    if (online) {
      const apiSuccess = await loadFromAPI();
      if (!apiSuccess) {
        await loadFromStorage();
      }
    } else {
      await loadFromStorage();
    }
    
    setPendingCount(await getPendingCount());
    setLoading(false);
  }, [loadFromAPI, loadFromStorage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const online = await checkNetworkStatus();
    setIsOnline(online);
    
    if (online) {
      await syncPendingVisits();
      const currentRepId = await getCurrentRepId();
      await pullDeltaScores(currentRepId, new Date().toISOString().split('T')[0]);
      await loadFromAPI();
    } else {
      await loadFromStorage();
    }
    
    setPendingCount(await getPendingCount());
    setRefreshing(false);
  }, [loadFromAPI, loadFromStorage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (netInfo.isConnected !== null) {
      setIsOnline(netInfo.isConnected);
      if (netInfo.isConnected) {
        syncPendingVisits();
      }
    }
  }, [netInfo.isConnected]);

  const syncedCount = retailers.filter(r => r.priority <= 2).length;
  const alertCount = retailers.filter(r => ['URGENT_RESTOCK', 'OVERDUE_HIGH', 'ANOMALY_ALERT'].includes(r.action_code)).length;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a5276" />
        <Text style={styles.loadingText}>Loading retailers...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AgriPulse Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.summaryNumber}>{syncedCount}</Text>
          <Text style={styles.summaryLabel}>High Priority</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.summaryNumber}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#F44336' }]}>
          <Text style={styles.summaryNumber}>{alertCount}</Text>
          <Text style={styles.summaryLabel}>Alerts</Text>
        </View>
      </View>

      <View style={styles.syncInfo}>
        <Text style={styles.syncInfoText}>Last sync: {lastSync}</Text>
        {!isOnline && <Text style={styles.offlineText}>Showing cached data</Text>}
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Priority Retailers ({retailers.length})</Text>
        {retailers.length === 0 ? (
          <Text style={styles.emptyText}>No retailers. Pull to refresh.</Text>
        ) : (
          retailers.map(r => (
            <RetailerCard key={r.retailer_id} retailer={r} displayName={getDisplayName} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#666' },
  header: { 
    backgroundColor: '#1a5276', 
    padding: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  summaryBox: { borderRadius: 10, padding: 16, alignItems: 'center', width: '28%' },
  summaryNumber: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  syncInfo: { paddingHorizontal: 20, paddingBottom: 8 },
  syncInfoText: { color: '#666', fontSize: 12 },
  offlineText: { color: '#FF9800', fontSize: 12, marginTop: 4 },
  list: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retailerName: { fontSize: 16, fontWeight: 'bold', color: '#1a5276' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  location: { color: '#777', fontSize: 12, marginTop: 4 },
  score: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 8 },
  reason: { color: '#666', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  action: { color: '#1a5276', fontSize: 13, fontWeight: '600', marginTop: 6 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 40 },
});