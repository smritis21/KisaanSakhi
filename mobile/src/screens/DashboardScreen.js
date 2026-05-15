import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const dummyData = [
  {
    id: 'REP_0001',
    name: 'Rajesh Kumar',
    pending: 3,
    alerts: 1,
    syncStatus: 'synced',
  },
  {
    id: 'REP_0002',
    name: 'Priya Sharma',
    pending: 0,
    alerts: 0,
    syncStatus: 'synced',
  },
  {
    id: 'REP_0003',
    name: 'Anil Verma',
    pending: 5,
    alerts: 2,
    syncStatus: 'pending',
  },
  {
    id: 'REP_0004',
    name: 'Sunita Patel',
    pending: 1,
    alerts: 3,
    syncStatus: 'alert',
  },
];

const statusColors = {
  synced: '#4CAF50',   // green
  pending: '#FF9800',  // orange
  alert: '#F44336',    // red
};

function RetailerCard({ rep }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.repName}>{rep.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[rep.syncStatus] }]}>
          <Text style={styles.statusText}>{rep.syncStatus.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.repId}>ID: {rep.id}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.statText}>📋 Pending Visits: {rep.pending}</Text>
        <Text style={styles.statText}>🔔 Alerts: {rep.alerts}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AgriPulse Dashboard</Text>
        <Text style={styles.headerSubtitle}>Today's Summary</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.summaryNumber}>2</Text>
          <Text style={styles.summaryLabel}>Synced</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.summaryNumber}>1</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#F44336' }]}>
          <Text style={styles.summaryNumber}>1</Text>
          <Text style={styles.summaryLabel}>Alerts</Text>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {dummyData.map((rep) => (
          <RetailerCard key={rep.id} rep={rep} />
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  summaryBox: { borderRadius: 10, padding: 16, alignItems: 'center', width: '28%' },
  summaryNumber: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
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