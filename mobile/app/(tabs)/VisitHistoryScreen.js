import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { getPendingCount } from '../../src/services/dbService';
import { syncPendingVisits, checkNetworkStatus } from '../../src/services/syncService';
import { getApiConfig } from '../../src/services/configService';
import { AppColors, Shadow } from '../../constants/theme';

const REP_ID = 'REP_0016';

async function fetchVisitsFromRailway() {
  const { baseUrl, token } = await getApiConfig();
  const res = await fetch(`${baseUrl}/sync/visits/${REP_ID}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.visits || []).map(v => ({
    ...v,
    queue_id: `${v.retailer_id || v.visit_tehsil}-${v.visit_timestamp}`,
    synced: 1,
    visit_timestamp: v.visit_timestamp || v.visit_date,
  }));
}

const OUTCOME_META = {
  VISIT_COMPLETE: { label: 'Visit Completed',       color: AppColors.success, icon: '✅' },
  NOT_AVAILABLE:  { label: 'Retailer Not Available', color: AppColors.warning, icon: '🚫' },
  CLOSED:         { label: 'Shop Closed',            color: AppColors.textMuted, icon: '🔒' },
  REFUSED:        { label: 'Visit Refused',          color: AppColors.danger,  icon: '❌' },
  RESCHEDULED:    { label: 'Rescheduled',            color: AppColors.info,    icon: '📅' },
};

function VisitCard({ visit }) {
  const meta = OUTCOME_META[visit.outcome_code] || { label: visit.outcome_code, color: AppColors.textMuted, icon: '📋' };
  const synced = !!visit.synced;
  const ts = visit.visit_timestamp ? new Date(visit.visit_timestamp) : null;

  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.retailerId} numberOfLines={1}>{visit.retailer_id}</Text>
          <View style={[styles.syncBadge, { backgroundColor: synced ? AppColors.successLight : AppColors.warningLight }]}>
            <Text style={[styles.syncBadgeText, { color: synced ? AppColors.success : AppColors.warning }]}>
              {synced ? '✓ Synced' : '⏳ Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.outcomeRow}>
          <Text style={styles.outcomeIcon}>{meta.icon}</Text>
          <Text style={[styles.outcomeLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {visit.product_recommended ? (
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>🌱 {visit.product_recommended}</Text>
            </View>
          </View>
        ) : null}

        {visit.notes ? (
          <Text style={styles.notes} numberOfLines={2}>"{visit.notes}"</Text>
        ) : null}

        {ts && (
          <Text style={styles.timestamp}>
            {ts.toLocaleDateString()} · {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function VisitHistoryScreen() {
  const [visits, setVisits] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisits = useCallback(async () => {
    const online = await checkNetworkStatus();
    setIsOnline(online);
    if (online) {
      const remote = await fetchVisitsFromRailway();
      setVisits(remote);
    }
    setPendingCount(await getPendingCount());
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const online = await checkNetworkStatus();
    setIsOnline(online);
    if (online) await syncPendingVisits();
    await loadVisits();
    setRefreshing(false);
  }, [loadVisits]);

  async function handleSync() {
    const result = await syncPendingVisits();
    await loadVisits();
    if (result.success) {
      Alert.alert('Synced ✅', `${result.synced} visit${result.synced !== 1 ? 's' : ''} uploaded to server.`);
    } else {
      Alert.alert('Sync failed', result.reason || 'Unknown error');
    }
  }

  const syncedCount   = visits.filter(v => v.synced).length;
  const pendingVisits = visits.filter(v => !v.synced).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>AgriPulse AI</Text>
          <Text style={styles.headerTitle}>Visit History</Text>
          <Text style={styles.headerRep}>👤 REP_0016</Text>
        </View>
        <View style={[styles.onlinePill, { backgroundColor: isOnline ? '#a5d6a7' : '#ef9a9a' }]}>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? AppColors.success : AppColors.danger }]} />
          <Text style={[styles.onlineText, { color: isOnline ? AppColors.success : AppColors.danger }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{visits.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: AppColors.success }]}>{syncedCount}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: pendingVisits > 0 ? AppColors.warning : AppColors.textMuted }]}>{pendingVisits}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        {pendingCount > 0 && isOnline && (
          <>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.syncBtn} onPress={handleSync} activeOpacity={0.8}>
              <Text style={styles.syncBtnText}>Sync now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AppColors.primaryMid]}
            tintColor={AppColors.primaryMid}
            title="Pull to refresh & sync"
            titleColor={AppColors.textMuted}
          />
        }
      >
        <Text style={styles.sectionLabel}>
          {visits.length > 0 ? `${visits.length} visit${visits.length !== 1 ? 's' : ''} logged` : ''}
        </Text>

        {visits.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No visits logged yet</Text>
            <Text style={styles.emptyHint}>Pull down to refresh</Text>
          </View>
        ) : (
          visits.map(v => <VisitCard key={v.queue_id} visit={v} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: AppColors.bg },

  header:         { backgroundColor: AppColors.primary, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerEyebrow:  { color: '#a5d6a7', fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  headerTitle:    { color: AppColors.white, fontSize: 24, fontWeight: '800', marginTop: 2 },
  headerRep:      { color: '#a5d6a7', fontSize: 12, fontWeight: '600', marginTop: 4 },
  onlinePill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  onlineDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  onlineText:     { fontSize: 12, fontWeight: '700' },

  statsBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: AppColors.white, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  statItem:       { flex: 1, alignItems: 'center' },
  statNum:        { fontSize: 20, fontWeight: '800', color: AppColors.textPrimary },
  statLabel:      { fontSize: 10, color: AppColors.textMuted, fontWeight: '600', marginTop: 2 },
  statDivider:    { width: 1, height: 32, backgroundColor: AppColors.border },
  syncBtn:        { backgroundColor: AppColors.primaryPale, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginLeft: 8 },
  syncBtnText:    { color: AppColors.primaryMid, fontWeight: '700', fontSize: 12 },

  list:           { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  sectionLabel:   { fontSize: 12, fontWeight: '700', color: AppColors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },

  card:           { flexDirection: 'row', backgroundColor: AppColors.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  cardAccent:     { width: 5 },
  cardBody:       { flex: 1, padding: 14 },
  cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  retailerId:     { fontSize: 15, fontWeight: '700', color: AppColors.textPrimary, flex: 1, marginRight: 8 },
  syncBadge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  syncBadgeText:  { fontSize: 11, fontWeight: '700' },
  outcomeRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  outcomeIcon:    { fontSize: 14 },
  outcomeLabel:   { fontSize: 13, fontWeight: '600' },
  tagRow:         { flexDirection: 'row', marginBottom: 6 },
  tag:            { backgroundColor: AppColors.primaryPale, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  tagText:        { fontSize: 12, color: AppColors.primaryMid, fontWeight: '600' },
  notes:          { fontSize: 12, color: AppColors.textMuted, fontStyle: 'italic', marginBottom: 6 },
  timestamp:      { fontSize: 11, color: AppColors.textMuted },

  emptyBox:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 16, fontWeight: '700', color: AppColors.textSecondary },
  emptyHint:      { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },
});
