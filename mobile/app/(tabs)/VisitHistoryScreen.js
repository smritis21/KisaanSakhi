import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert,
} from 'react-native';
import { getAllVisits, getPendingCount } from '../../src/services/dbService';
import { syncPendingVisits, checkNetworkStatus } from '../../src/services/syncService';

const OUTCOME_LABELS = {
  'VISIT_COMPLETE': 'Visit Completed',
  'NOT_AVAILABLE': 'Retailer Not Available',
  'CLOSED': 'Shop Closed',
  'REFUSED': 'Visit Refused',
  'RESCHEDULED': 'Rescheduled',
};

export default function VisitHistoryScreen() {
  const [visits, setVisits] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadVisits();
    
    const interval = setInterval(async () => {
      const pending = await getPendingCount();
      if (pending > 0) {
        const online = await checkNetworkStatus();
        if (online) await syncPendingVisits();
      }
      loadVisits();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadVisits() {
    const allVisits = await getAllVisits();
    setVisits(allVisits);
    setPendingCount(await getPendingCount());
    setIsOnline(await checkNetworkStatus());
  }

  async function handleSync() {
    const result = await syncPendingVisits();
    if (result.success) {
      Alert.alert('Synced', `${result.synced} visits synced to server`);
    }
    loadVisits();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Visit History</Text>
        <Text style={styles.subtitle}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </Text>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {pendingCount} pending sync
        </Text>
        {pendingCount > 0 && isOnline && (
          <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.list}>
        {visits.length === 0 ? (
          <Text style={styles.emptyText}>No visits logged yet</Text>
        ) : (
          visits.map((visit) => (
            <View key={visit.queue_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.retailerId}>{visit.retailer_id}</Text>
                <View style={[styles.syncBadge, { backgroundColor: visit.synced ? '#4CAF50' : '#FF9800' }]}>
                  <Text style={styles.syncBadgeText}>
                    {visit.synced ? 'Synced' : 'Pending'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.outcome}>
                {OUTCOME_LABELS[visit.outcome_code] || visit.outcome_code}
              </Text>
              
              {visit.product_recommended && (
                <Text style={styles.product}>Product: {visit.product_recommended}</Text>
              )}
              
              {visit.notes && (
                <Text style={styles.notes}>Notes: {visit.notes}</Text>
              )}
              
              <Text style={styles.timestamp}>
                {new Date(visit.visit_timestamp).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#1a5276', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#aed6f1', fontSize: 14 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  statusText: { fontSize: 14, color: '#666' },
  syncButton: { backgroundColor: '#1a5276', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  syncButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  list: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  retailerId: { fontSize: 16, fontWeight: 'bold', color: '#1a5276' },
  syncBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  syncBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  outcome: { fontSize: 14, color: '#333', marginBottom: 4 },
  product: { fontSize: 13, color: '#666', marginBottom: 4 },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 4 },
  timestamp: { fontSize: 11, color: '#999', marginTop: 8 },
});