import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getPriorityList, getLastSyncTime } from '../services/dbService';

const REP_ID = 'REP_0001';

export default function RouteViewScreen() {
  const netInfo = useNetInfo();
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoute();
  }, []);

  async function loadRoute() {
    setLoading(true);
    try {
      const retailers = await getPriorityList(REP_ID, new Date().toISOString().split('T')[0]);
      
      const tehsilGroups = {};
      retailers.forEach(r => {
        if (!tehsilGroups[r.tehsil]) {
          tehsilGroups[r.tehsil] = [];
        }
        tehsilGroups[r.tehsil].push(r);
      });

      const orderedRoute = Object.entries(tehsilGroups)
        .sort((a, b) => {
          const aTop = a[1][0]?.priority || 99;
          const bTop = b[1][0]?.priority || 99;
          return aTop - bTop;
        })
        .map(([tehsil, retailers]) => ({
          tehsil,
          count: retailers.length,
          retailers: retailers.slice(0, 3),
        }));

      setRoute(orderedRoute);
    } catch (e) {
      console.log('Route load error:', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a5276" />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📍 Today's Route</Text>
        <Text style={styles.headerSubtitle}>
          {netInfo.isConnected ? '🟢 Online' : '🔴 Offline'}
        </Text>
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {route.length} stops • {route.reduce((sum, t) => sum + t.count, 0)} retailers
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {route.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No route assigned</Text>
            <Text style={styles.emptySubtext}>Sync to get your priority list</Text>
          </View>
        ) : (
          route.map((stop, index) => (
            <View key={stop.tehsil} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopTehsil}>{stop.tehsil}</Text>
                  <Text style={styles.stopCount}>{stop.count} retailer{stop.count > 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity style={styles.navigateButton}>
                  <Text style={styles.navigateText}>Navigate</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.retailerList}>
                {stop.retailers.map((r) => (
                  <View key={r.retailer_id} style={styles.retailerItem}>
                    <View style={styles.retailerInfo}>
                      <Text style={styles.retailerId}>{r.retailer_id}</Text>
                      <Text style={styles.retailerScore}>
                        Score: {(r.opportunity_score * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, {
                      backgroundColor: r.priority <= 1 ? '#F44336' : r.priority <= 2 ? '#FF9800' : '#4CAF50'
                    }]}>
                      <Text style={styles.priorityText}>P{r.priority}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.syncButton} onPress={loadRoute}>
          <Text style={styles.syncButtonText}>🔄 Refresh Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  header: {
    backgroundColor: '#1a5276',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#aed6f1', fontSize: 14 },
  summaryBar: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  summaryText: { color: '#333', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { color: '#666', marginTop: 8 },
  stopCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8f9fa' },
  stopNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a5276', justifyContent: 'center', alignItems: 'center' },
  stopNumberText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  stopInfo: { flex: 1, marginLeft: 12 },
  stopTehsil: { fontSize: 16, fontWeight: '600', color: '#1a5276' },
  stopCount: { fontSize: 12, color: '#666', marginTop: 2 },
  navigateButton: { backgroundColor: '#1a5276', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  navigateText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  retailerList: { padding: 12 },
  retailerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  retailerInfo: { flex: 1 },
  retailerId: { fontSize: 14, fontWeight: '500', color: '#333' },
  retailerScore: { fontSize: 12, color: '#666', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  priorityText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  syncButton: { backgroundColor: '#1a5276', padding: 14, borderRadius: 8, alignItems: 'center' },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});