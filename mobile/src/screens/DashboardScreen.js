import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { initDb, getPendingCount, getMeta } from '../services/dbService';
import { syncPendingVisits, checkNetworkStatus, pullDeltaScores } from '../services/syncService';

export default function DashboardScreen() {
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const netInfo = useNetInfo();

  useEffect(() => {
    initDb();
    loadStatus();
    if (netInfo.isConnected) {
      pullDeltaScores('REP_0001', new Date().toISOString().split('T')[0]).then(loadStatus);
    }
  }, []);

  useEffect(() => {
    setIsOnline(netInfo.isConnected);
    if (netInfo.isConnected) {
      syncPendingVisits();
    }
  }, [netInfo]);

  async function loadStatus() {
    const pending = await getPendingCount();
    const syncTime = await getMeta('last_sync_REP_0001');
    setPendingCount(pending);
    setLastSync(syncTime ? new Date(syncTime).toLocaleTimeString() : 'Never');
  }

  async function onRefresh() {
    setRefreshing(true);
    const online = await checkNetworkStatus();
    if (online) {
      await syncPendingVisits();
      await pullDeltaScores('REP_0001', new Date().toISOString().split('T')[0]);
    }
    await loadStatus();
    setRefreshing(false);
  }

  const syncedCount = 2;
  const alertCount = 1;

  const statusColors = {
    synced: '#4CAF50',
    pending: '#FF9800',
    alert: '#F44336',
  };

  const reps = [
    { id: 'REP_0001', name: 'Rajesh Kumar', pending: pendingCount, alerts: alertCount, syncStatus: pendingCount > 0 ? 'pending' : 'synced' },
    { id: 'REP_0002', name: 'Priya Sharma', pending: 0, alerts: 0, syncStatus: 'synced' },
    { id: 'REP_0003', name: 'Anil Verma', pending: 5, alerts: 2, syncStatus: 'pending' },
    { id: 'REP_0004', name: 'Sunita Patel', pending: 1, alerts: 3, syncStatus: 'alert' },
  ];

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
          <Text style={styles.summaryLabel}>Synced</Text>
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
        <Text style={styles.syncInfoText}>
          Last sync: {lastSync}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reps.map((rep) => (
          <View key={rep.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.repName}>{rep.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[rep.syncStatus] }]}>
                <Text style={styles.statusText}>{rep.syncStatus.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.repId}>ID: {rep.id}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.statText}>📋 Pending: {rep.pending}</Text>
              <Text style={styles.statText}>🔔 Alerts: {rep.alerts}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#1a5276', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  summaryBox: { borderRadius: 10, padding: 16, alignItems: 'center', width: '28%' },
  summaryNumber: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  syncInfo: { paddingHorizontal: 20, paddingBottom: 8 },
  syncInfoText: { color: '#666', fontSize: 12 },
  list: { paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repName: { fontSize: 16, fontWeight: 'bold', color: '#1a5276' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  repId: { color: '#888', fontSize: 12, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  statText: { fontSize: 13, color: '#555' },
});