import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import SyncStatusBar from '../components/SyncStatusBar';
import { initDb, getPriorityList, getPendingCount } from '../services/dbService';
import { syncPendingVisits, checkNetworkStatus, pullDeltaScores } from '../services/syncService';

function ScoreBar({ score }) {
  const color = score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336';
  return (
    <View style={styles.scoreBarContainer}>
      <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
      <Text style={styles.scoreText}>{score}</Text>
    </View>
  );
}

function SHAPCard({ reasons }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <View style={styles.shapContainer}>
      <Text style={styles.shapTitle}>🔍 Why this score?</Text>
      {reasons.map((r, i) => (
        <View key={i} style={styles.shapRow}>
          <Text style={styles.shapFeature}>{r.feature || r}</Text>
          <Text style={styles.shapImpact}>
            {typeof r === 'object' ? `${r.direction === 'positive' ? '▲' : '▼'} ${Math.abs(r.impact || 0).toFixed(2)}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RetailerCard({ retailer, onLogVisit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.retailerName}>{retailer.retailer_name || retailer.retailer_id}</Text>
          <Text style={styles.location}>📍 {retailer.tehsil}, {retailer.district}</Text>
        </View>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>#{retailer.priority}</Text>
        </View>
      </View>

      {retailer.anomaly_flag === 1 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ Anomaly Detected</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Opportunity Score</Text>
      <ScoreBar score={Math.round((retailer.opportunity_score || 0) * 100)} />

      <Text style={styles.sectionLabel}>Recommended Action</Text>
      <View style={styles.actionChip}>
        <Text style={styles.actionText}>🎯 {retailer.action_label || 'Schedule Visit'}</Text>
      </View>

      <Text style={styles.reasonText}>"{retailer.top_reason_text || 'No specific reason'}"</Text>

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandButtonText}>
          {expanded ? '▲ Hide Details' : '▼ Show Details'}
        </Text>
      </TouchableOpacity>

      {expanded && <SHAPCard reasons={retailer.shap_reasons} />}

      <TouchableOpacity
        style={styles.logButton}
        onPress={() => onLogVisit(retailer)}
      >
        <Text style={styles.logButtonText}>📝 Log Visit</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RetailerCardScreen() {
  const router = useRouter();
  const netInfo = useNetInfo();
  const [retailers, setRetailers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function init() {
      await initDb();
      if (netInfo.isConnected) {
        await pullDeltaScores('REP_0001', new Date().toISOString().split('T')[0]);
      }
      await loadData();
    }
    init();
  }, []);

  useEffect(() => {
    if (netInfo.isConnected) {
      syncPendingVisits();
      pullDeltaScores('REP_0001', new Date().toISOString().split('T')[0]).then(loadData);
    }
  }, [netInfo]);

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const list = await getPriorityList('REP_0001', today);
    setRetailers(list.length > 0 ? list : getDummyRetailers());
    setPendingCount(await getPendingCount());
    setLastSync(new Date().toLocaleTimeString());
  }

  async function onRefresh() {
    setRefreshing(true);
    const online = await checkNetworkStatus();
    if (online) {
      await syncPendingVisits();
      await pullDeltaScores('REP_0001', new Date().toISOString().split('T')[0]);
    }
    await loadData();
    setRefreshing(false);
  }

  function handleLogVisit(retailer) {
    router.push({
      pathname: '/VisitLoggerScreen',
      params: {
        retailer: JSON.stringify(retailer)
      }
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Retailer Priority List</Text>
        <Text style={styles.headerSubtitle}>
          {netInfo.isConnected ? '🟢 Online' : '🔴 Offline'}
        </Text>
      </View>

      <SyncStatusBar
        lastSync={lastSync}
        pendingCount={pendingCount}
        onForceSync={() => {
          syncPendingVisits().then(loadData);
        }}
      />

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {retailers.map((r) => (
          <RetailerCard key={r.retailer_id} retailer={r} onLogVisit={handleLogVisit} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function getDummyRetailers() {
  return [
    {
      retailer_id: 'RET_001',
      retailer_name: 'Kaveri Agro Store',
      tehsil: 'Mettur',
      district: 'Salem',
      opportunity_score: 87,
      anomaly_flag: 1,
      action_label: 'Upsell Fertilizer',
      top_reason_text: 'Purchase frequency dropped 40% this season',
      priority: 1,
      shap_reasons: [
        { feature: 'Purchase Frequency', impact: -0.32, direction: 'negative' },
        { feature: 'Last Visit Gap', impact: -0.21, direction: 'negative' },
        { feature: 'Inventory Level', impact: 0.15, direction: 'positive' },
      ],
    },
    {
      retailer_id: 'RET_002',
      retailer_name: 'Sakthi Seeds & Fertilizers',
      tehsil: 'Dharmapuri',
      district: 'Dharmapuri',
      opportunity_score: 72,
      anomaly_flag: 0,
      action_label: 'Schedule Visit',
      top_reason_text: 'High seasonal demand expected next week',
      priority: 2,
      shap_reasons: [
        { feature: 'Seasonal Demand', impact: 0.28, direction: 'positive' },
        { feature: 'Competitor Activity', impact: -0.18, direction: 'negative' },
      ],
    },
    {
      retailer_id: 'RET_003',
      retailer_name: 'Green Earth Agri',
      tehsil: 'Erode',
      district: 'Erode',
      opportunity_score: 55,
      anomaly_flag: 0,
      action_label: 'Send WhatsApp Campaign',
      top_reason_text: 'Consistent buyer, low engagement recently',
      priority: 3,
      shap_reasons: [
        { feature: 'Engagement Score', impact: -0.25, direction: 'negative' },
        { feature: 'Order Value', impact: 0.10, direction: 'positive' },
      ],
    },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#1a5276', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14 },
  list: { paddingHorizontal: 16, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  retailerName: { fontSize: 16, fontWeight: 'bold', color: '#1a5276', maxWidth: 220 },
  location: { color: '#777', fontSize: 12, marginTop: 3 },
  priorityBadge: { backgroundColor: '#1a5276', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  priorityText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  alertBanner: { backgroundColor: '#fdebd0', borderRadius: 6, padding: 6, marginTop: 10 },
  alertText: { color: '#d35400', fontWeight: 'bold', fontSize: 13 },
  sectionLabel: { fontSize: 12, color: '#888', marginTop: 12, marginBottom: 4, fontWeight: '600' },
  scoreBarContainer: { height: 20, backgroundColor: '#eee', borderRadius: 10, overflow: 'hidden', justifyContent: 'center' },
  scoreBarFill: { position: 'absolute', height: '100%', borderRadius: 10 },
  scoreText: { textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#333' },
  actionChip: { backgroundColor: '#eaf4fb', borderRadius: 8, padding: 8 },
  actionText: { color: '#1a5276', fontWeight: '600', fontSize: 13 },
  reasonText: { color: '#666', fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  expandButton: { marginTop: 10, alignItems: 'center' },
  expandButtonText: { color: '#1a5276', fontWeight: '600', fontSize: 13 },
  shapContainer: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginTop: 8 },
  shapTitle: { fontWeight: 'bold', fontSize: 13, marginBottom: 8, color: '#333' },
  shapRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  shapFeature: { fontSize: 12, color: '#555' },
  shapImpact: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50' },
  logButton: { backgroundColor: '#1a5276', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 12 },
  logButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});