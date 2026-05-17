import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getPendingCount } from '../services/dbService';
import { syncPendingVisits, checkNetworkStatus, pullDeltaScores } from '../services/syncService';

const API_BASE = 'http://192.168.1.44:8001/api/v1';
const TOKEN = 'agripulse-hackathon-secret-key-2026';
const REP_ID = 'REP_0001';

const statusColors = {
  OVERDUE_VISIT: '#F44336',
  STANDARD_VISIT: '#FF9800',
  LOW_PRIORITY: '#4CAF50',
  UPSELL: '#2196F3',
  synced: '#4CAF50',
  pending: '#FF9800',
  alert: '#F44336',
};

function RetailerCard({ retailer }) {
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
      <Text style={styles.reason}>"{retailer.top_reason_text}"</Text>
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

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/reps/${REP_ID}/priority-list?date=2026-05-15`, {
        headers: { authorization: `Bearer ${TOKEN}` },
      });
      const data = await response.json();
      setRetailers(data.retailers || []);
      setPendingCount(await getPendingCount());
      setLastSync(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setIsOnline(netInfo.isConnected);
    if (netInfo.isConnected) {
      syncPendingVisits();
    }
  }, [netInfo]);

  async function onRefresh() {
    setRefreshing(true);
    const online = await checkNetworkStatus();
    if (online) {
      await syncPendingVisits();
      await pullDeltaScores(REP_ID, new Date().toISOString().split('T')[0]);
    }
    await loadData();
    setRefreshing(false);
  }

  const isOnline = netInfo.isConnected;
  const syncedCount = 2;
  const alertCount = 1;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a5276" />
        <Text>Loading retailers...</Text>
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
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
        <Text style={styles.syncInfoText}>Last sync: {lastSync}</Text>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Priority Retailers ({retailers.length})</Text>
        {retailers.map(r => <RetailerCard key={r.retailer_id} retailer={r} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a5276', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  summaryBox: { borderRadius: 10, padding: 16, alignItems: 'center', width: '28%' },
  summaryNumber: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  syncInfo: { paddingHorizontal: 20, paddingBottom: 8 },
  syncInfoText: { color: '#666', fontSize: 12 },
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
  errorText: { color: 'red', fontSize: 16 },
});