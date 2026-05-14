import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, SafeAreaView,
  TouchableOpacity, Alert,
} from 'react-native';
import SyncStatusBar from '../components/SyncStatusBar';

const dummyRetailers = [
  {
    id: 'RET_001',
    name: 'Kaveri Agro Store',
    location: 'Mettur, Salem',
    opportunityScore: 87,
    anomalyFlag: true,
    actionLabel: 'Upsell Fertilizer',
    topReason: 'Purchase frequency dropped 40% this season',
    shapReasons: [
      { feature: 'Purchase Frequency', impact: -0.32, direction: 'negative' },
      { feature: 'Last Visit Gap', impact: -0.21, direction: 'negative' },
      { feature: 'Inventory Level', impact: +0.15, direction: 'positive' },
    ],
    priority: 1,
  },
  {
    id: 'RET_002',
    name: 'Sakthi Seeds & Fertilizers',
    location: 'Dharmapuri',
    opportunityScore: 72,
    anomalyFlag: false,
    actionLabel: 'Schedule Visit',
    topReason: 'High seasonal demand expected next week',
    shapReasons: [
      { feature: 'Seasonal Demand', impact: +0.28, direction: 'positive' },
      { feature: 'Competitor Activity', impact: -0.18, direction: 'negative' },
      { feature: 'Payment History', impact: +0.12, direction: 'positive' },
    ],
    priority: 2,
  },
  {
    id: 'RET_003',
    name: 'Green Earth Agri',
    location: 'Erode',
    opportunityScore: 55,
    anomalyFlag: false,
    actionLabel: 'Send WhatsApp Campaign',
    topReason: 'Consistent buyer, low engagement recently',
    shapReasons: [
      { feature: 'Engagement Score', impact: -0.25, direction: 'negative' },
      { feature: 'Order Value', impact: +0.10, direction: 'positive' },
      { feature: 'Visit Recency', impact: -0.08, direction: 'negative' },
    ],
    priority: 3,
  },
];

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
  return (
    <View style={styles.shapContainer}>
      <Text style={styles.shapTitle}>🔍 Why this score?</Text>
      {reasons.map((r, i) => (
        <View key={i} style={styles.shapRow}>
          <Text style={styles.shapFeature}>{r.feature}</Text>
          <Text style={[
            styles.shapImpact,
            { color: r.direction === 'positive' ? '#4CAF50' : '#F44336' }
          ]}>
            {r.direction === 'positive' ? '▲' : '▼'} {Math.abs(r.impact).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RetailerCard({ retailer }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.retailerName}>{retailer.name}</Text>
          <Text style={styles.location}>📍 {retailer.location}</Text>
        </View>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>#{retailer.priority}</Text>
        </View>
      </View>

      {retailer.anomalyFlag && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ Anomaly Detected</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Opportunity Score</Text>
      <ScoreBar score={retailer.opportunityScore} />

      <Text style={styles.sectionLabel}>Recommended Action</Text>
      <View style={styles.actionChip}>
        <Text style={styles.actionText}>🎯 {retailer.actionLabel}</Text>
      </View>

      <Text style={styles.reasonText}>"{retailer.topReason}"</Text>

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandButtonText}>
          {expanded ? '▲ Hide SHAP Details' : '▼ Show SHAP Details'}
        </Text>
      </TouchableOpacity>

      {expanded && <SHAPCard reasons={retailer.shapReasons} />}

      <TouchableOpacity
        style={styles.logButton}
        onPress={() => Alert.alert('Visit Logged!', `Visit for ${retailer.name} queued for sync.`)}
      >
        <Text style={styles.logButtonText}>📝 Log Visit</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RetailerCardScreen() {
  const pendingCount = 3;
  const lastSync = '12:30 PM';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Retailer Priority List</Text>
        <Text style={styles.headerSubtitle}>Ranked by Opportunity Score</Text>
      </View>

      <SyncStatusBar
        lastSync={lastSync}
        pendingCount={pendingCount}
        onForceSync={() => Alert.alert('Sync', 'Force sync triggered!')}
      />

      <ScrollView style={styles.list}>
        {dummyRetailers.map((r) => (
          <RetailerCard key={r.id} retailer={r} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#1a5276', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14, marginTop: 4 },
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
  shapImpact: { fontSize: 12, fontWeight: 'bold' },
  logButton: { backgroundColor: '#1a5276', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 12 },
  logButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});