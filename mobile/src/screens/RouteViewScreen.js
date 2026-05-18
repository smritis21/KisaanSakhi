import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Alert, Pressable,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getPriorityList } from '../services/dbService';
import { syncPendingVisits, pullDeltaScores } from '../services/syncService';
import { AppColors, Shadow } from '../../constants/theme';

const REP_ID = 'REP_0016';

function openMaps(tehsil) {
  const query = encodeURIComponent(`${tehsil}, India`);
  Alert.alert(
    'Navigate to ' + tehsil,
    'Open in Google Maps?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Maps',
        onPress: () => {
          const url = `https://maps.google.com/maps?q=${query}`;
          Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
        },
      },
    ]
  );
}

function PriorityDot({ priority }) {
  const color = priority <= 1 ? AppColors.danger : priority <= 2 ? AppColors.warning : AppColors.success;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export default function RouteViewScreen() {
  const netInfo = useNetInfo();
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoute = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (netInfo.isConnected) {
        await syncPendingVisits();
        await pullDeltaScores(REP_ID, today);
      }
      const retailers = await getPriorityList(REP_ID, today);

      const groups = {};
      retailers.forEach(r => {
        if (!groups[r.tehsil]) groups[r.tehsil] = [];
        groups[r.tehsil].push(r);
      });

      const ordered = Object.entries(groups)
        .sort((a, b) => (a[1][0]?.priority || 99) - (b[1][0]?.priority || 99))
        .map(([tehsil, list]) => ({
          tehsil,
          count: list.length,
          topPriority: list[0]?.priority || 4,
          avgScore: list.reduce((s, r) => s + (r.opportunity_score || 0), 0) / list.length,
          retailers: list.slice(0, 4),
        }));

      setRoute(ordered);
    } catch (e) {
      console.log('Route error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [netInfo.isConnected]);

  useEffect(() => { loadRoute(); }, []);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadRoute(); }, [loadRoute]);

  const totalRetailers = route.reduce((s, t) => s + t.count, 0);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AppColors.primaryMid} />
        <Text style={styles.loadingText}>Building your route…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>AgriPulse AI</Text>
          <Text style={styles.headerTitle}>Today's Route</Text>
          <Text style={styles.headerRep}>👤 {REP_ID}</Text>
        </View>
        <View style={[styles.onlinePill, { backgroundColor: netInfo.isConnected ? '#a5d6a7' : '#ef9a9a' }]}>
          <View style={[styles.onlineDot, { backgroundColor: netInfo.isConnected ? AppColors.success : AppColors.danger }]} />
          <Text style={[styles.onlineText, { color: netInfo.isConnected ? AppColors.success : AppColors.danger }]}>
            {netInfo.isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{route.length}</Text>
          <Text style={styles.summaryLabel}>Stops</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{totalRetailers}</Text>
          <Text style={styles.summaryLabel}>Retailers</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: AppColors.danger }]}>
            {route.filter(t => t.topPriority <= 1).length}
          </Text>
          <Text style={styles.summaryLabel}>Urgent</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        disableScrollViewPanResponder
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primaryMid]} />}
      >
        {route.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>No route assigned</Text>
            <Text style={styles.emptyHint}>Sync to get your priority list</Text>
          </View>
        ) : (
          route.map((stop, index) => (
            <View key={stop.tehsil} style={[styles.stopCard, Shadow.md]}>
              <View style={styles.stopHeader}>
                <View style={[styles.stopBadge, { backgroundColor: stop.topPriority <= 1 ? AppColors.danger : stop.topPriority <= 2 ? AppColors.warning : AppColors.primaryMid }]}>
                  <Text style={styles.stopBadgeText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopTehsil}>{stop.tehsil}</Text>
                  <Text style={styles.stopMeta}>
                    {stop.count} retailer{stop.count > 1 ? 's' : ''} · avg {Math.round(stop.avgScore * 100)}% score
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  console.log('[Route] Navigate pressed:', stop.tehsil);
                  openMaps(stop.tehsil);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.navBtnText}>🗺️ Navigate to {stop.tehsil}</Text>
              </TouchableOpacity>

              {/* Retailer rows */}
              <View style={styles.retailerList}>
                {stop.retailers.map((r, i) => (
                  <View key={r.retailer_id} style={[styles.retailerRow, i < stop.retailers.length - 1 && styles.retailerRowBorder]}>
                    <PriorityDot priority={r.priority} />
                    <Text style={styles.retailerId} numberOfLines={1}>{r.retailer_id}</Text>
                    <Text style={styles.retailerScore}>{Math.round((r.opportunity_score || 0) * 100)}%</Text>
                    <View style={[styles.pBadge, {
                      backgroundColor: r.priority <= 1 ? AppColors.dangerLight : r.priority <= 2 ? AppColors.warningLight : AppColors.successLight,
                    }]}>
                      <Text style={[styles.pBadgeText, {
                        color: r.priority <= 1 ? AppColors.danger : r.priority <= 2 ? AppColors.warning : AppColors.success,
                      }]}>P{r.priority}</Text>
                    </View>
                  </View>
                ))}
                {stop.count > 4 && (
                  <Text style={styles.moreText}>+{stop.count - 4} more retailers</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadRoute} activeOpacity={0.85}>
          <Text style={styles.refreshBtnText}>🔄  Refresh Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: AppColors.bg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:    { marginTop: 12, color: AppColors.textMuted, fontSize: 14 },

  header:         { backgroundColor: AppColors.primary, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerEyebrow:  { color: '#a5d6a7', fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  headerTitle:    { color: AppColors.white, fontSize: 24, fontWeight: '800', marginTop: 2 },
  headerRep:      { color: '#a5d6a7', fontSize: 12, fontWeight: '600', marginTop: 4 },
  onlinePill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  onlineDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  onlineText:     { fontSize: 12, fontWeight: '700' },

  summaryBar:     { flexDirection: 'row', backgroundColor: AppColors.white, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryNum:     { fontSize: 22, fontWeight: '800', color: AppColors.textPrimary },
  summaryLabel:   { fontSize: 11, color: AppColors.textMuted, fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: AppColors.border },

  content:        { flex: 1, padding: 16 },

  stopCard:       { backgroundColor: AppColors.white, borderRadius: 16, marginBottom: 14 },
  stopHeader:     { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: AppColors.primaryPale },
  stopBadge:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stopBadgeText:  { color: AppColors.white, fontWeight: '900', fontSize: 16 },
  stopInfo:       { flex: 1 },
  stopTehsil:     { fontSize: 16, fontWeight: '800', color: AppColors.primary },
  stopMeta:       { fontSize: 11, color: AppColors.textMuted, marginTop: 2 },
  navBtn:         { backgroundColor: AppColors.primaryMid, margin: 12, marginTop: 0, borderRadius: 10, padding: 12, alignItems: 'center' },
  navBtnText:     { color: AppColors.white, fontSize: 13, fontWeight: '700' },

  retailerList:   { paddingHorizontal: 14, paddingVertical: 8 },
  retailerRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  retailerRowBorder: { borderBottomWidth: 1, borderBottomColor: AppColors.border },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  retailerId:     { flex: 1, fontSize: 13, fontWeight: '600', color: AppColors.textPrimary },
  retailerScore:  { fontSize: 13, fontWeight: '700', color: AppColors.textSecondary, marginRight: 4 },
  pBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pBadgeText:     { fontSize: 11, fontWeight: '800' },
  moreText:       { fontSize: 12, color: AppColors.textMuted, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },

  emptyBox:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 16, fontWeight: '700', color: AppColors.textSecondary },
  emptyHint:      { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },

  footer:         { padding: 16, backgroundColor: AppColors.white, borderTopWidth: 1, borderTopColor: AppColors.border },
  refreshBtn:     { backgroundColor: AppColors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  refreshBtnText: { color: AppColors.white, fontSize: 15, fontWeight: '800' },
});
