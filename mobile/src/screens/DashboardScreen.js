import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';

const API_BASE = 'http://10.101.3.38:8000';
const TOKEN = 'your-secret-key-here';
const REP_ID = 'REP_0001';

const statusColors = {
  OVERDUE_VISIT: '#F44336',
  STANDARD_VISIT: '#FF9800',
  LOW_PRIORITY: '#4CAF50',
  UPSELL: '#2196F3',
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
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/reps/${REP_ID}/priority-list`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    })
      .then(res => res.json())
      .then(data => {
        setRetailers(data.retailers || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to connect to API');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a5276" />
      <Text>Loading retailers...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AgriPulse Dashboard</Text>
        <Text style={styles.headerSubtitle}>{retailers.length} Retailers • REP_0001</Text>
      </View>
      <ScrollView style={styles.list}>
        {retailers.map(r => <RetailerCard key={r.retailer_id} retailer={r} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a5276', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14, marginTop: 4 },
  list: { paddingHorizontal: 16, marginTop: 8 },
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