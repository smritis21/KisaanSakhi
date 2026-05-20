import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl, TouchableOpacity,
  Modal, Pressable,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getPendingCount, getAllRetailers } from '../services/dbService';
import { syncPendingVisits, checkNetworkStatus, pullDeltaScores } from '../services/syncService';
import { getApiConfig, getCurrentRepId, initializeConfigService } from '../services/configService';
import { AppColors, Shadow } from '../../constants/theme';

const ACTION_META = {
  URGENT_RESTOCK:    { color: AppColors.danger,            bg: AppColors.dangerLight,   icon: '🚨' },
  OVERDUE_HIGH:      { color: AppColors.OVERDUE_HIGH,      bg: '#fce4ec',               icon: '⚠️' },
  INVESTIGATE_SPIKE: { color: AppColors.INVESTIGATE_SPIKE, bg: '#f3e5f5',               icon: '🔍' },
  OVERDUE_VISIT:     { color: AppColors.warning,           bg: AppColors.warningLight,  icon: '📅' },
  ANOMALY_ALERT:     { color: AppColors.ANOMALY_ALERT,     bg: '#fbe9e7',               icon: '⚡' },
  STANDARD_VISIT:    { color: AppColors.info,              bg: AppColors.infoLight,     icon: '📋' },
  LOW_PRIORITY:      { color: AppColors.success,           bg: AppColors.successLight,  icon: '✅' },
};

const OUTCOME_META = {
  VISIT_COMPLETE: { label: 'Visit Completed', color: AppColors.success,   icon: '✅' },
  NOT_AVAILABLE:  { label: 'Not Available',   color: AppColors.warning,   icon: '🚫' },
  CLOSED:         { label: 'Shop Closed',     color: AppColors.textMuted, icon: '🔒' },
  REFUSED:        { label: 'Refused',         color: AppColors.danger,    icon: '❌' },
  RESCHEDULED:    { label: 'Rescheduled',     color: AppColors.info,      icon: '📅' },
};

function StatCard({ value, label, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RetailerModal({ retailer, visible, onClose }) {
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    if (!visible || !retailer) return;
    setVisits([]);
    setLoadingVisits(true);
    getApiConfig().then(({ baseUrl, token }) => {
      fetch(`${baseUrl}/sync/visits/REP_0016`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          const filtered = (data.visits || []).filter(v => v.retailer_id === retailer.retailer_id);
          setVisits(filtered);
        })
        .catch(() => setVisits([]))
        .finally(() => setLoadingVisits(false));
    });
  }, [visible, retailer]);

  if (!retailer) return null;
  const meta = ACTION_META[retailer.action_code] || ACTION_META.LOW_PRIORITY;
  const score = Math.round((retailer.opportunity_score || 0) * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />

          <View style={[styles.modalHeader, { borderLeftColor: meta.color }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalRetailerId}>{retailer.retailer_id}</Text>
              <Text style={styles.modalLocation}>📍 {retailer.tehsil}, {retailer.district}</Text>
            </View>
            <View style={[styles.modalScoreBadge, { borderColor: meta.color }]}>
              <Text style={[styles.modalScoreNum, { color: meta.color }]}>{score}</Text>
              <Text style={styles.modalScoreLabel}>score</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalActionRow, { backgroundColor: meta.bg || '#f5f5f5' }]}>
              <Text style={[styles.modalActionText, { color: meta.color }]}>
                {meta.icon}  {retailer.action_label || retailer.action_code?.replace(/_/g, ' ')}
              </Text>
            </View>

            <View style={styles.modalStatsRow}>
              {retailer.days_to_stockout != null && (
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatVal}>{Math.round(retailer.days_to_stockout)}d</Text>
                  <Text style={styles.modalStatLabel}>To Stockout</Text>
                </View>
              )}
              {retailer.days_since_last_visit != null && (
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatVal}>{Math.round(retailer.days_since_last_visit)}d</Text>
                  <Text style={styles.modalStatLabel}>Since Visit</Text>
                </View>
              )}
              {retailer.pos_revenue_30d != null && (
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatVal}>₹{Math.round(retailer.pos_revenue_30d / 1000)}k</Text>
                  <Text style={styles.modalStatLabel}>Rev 30d</Text>
                </View>
              )}
              {retailer.tilt_stock != null && (
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatVal}>{Math.round(retailer.tilt_stock)}</Text>
                  <Text style={styles.modalStatLabel}>Tilt Stock</Text>
                </View>
              )}
            </View>

            {retailer.top_reason_text ? (
              <View style={styles.modalReasonBox}>
                <Text style={styles.modalReasonLabel}>AI Insight</Text>
                <Text style={styles.modalReasonText}>"{retailer.top_reason_text}"</Text>
              </View>
            ) : null}

            <Text style={styles.modalSectionTitle}>Past Visits</Text>
            {loadingVisits ? (
              <ActivityIndicator color={AppColors.primaryMid} style={{ marginVertical: 16 }} />
            ) : visits.length === 0 ? (
              <Text style={styles.modalNoVisits}>No visits recorded yet</Text>
            ) : (
              visits.map((v, i) => {
                const vm = OUTCOME_META[v.outcome_code] || { label: v.outcome_code, color: AppColors.textMuted, icon: '📋' };
                const raw = v.visit_timestamp || v.visit_date;
                const ts = raw ? new Date(raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z') : null;
                const displayTime = ts ? ts.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                return (
                  <View key={i} style={styles.visitRow}>
                    <View style={[styles.visitDot, { backgroundColor: vm.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.visitOutcome, { color: vm.color }]}>{vm.icon} {vm.label}</Text>
                      {v.product_recommended ? <Text style={styles.visitProduct}>🌱 {v.product_recommended}</Text> : null}
                      <Text style={styles.visitTime}>{displayTime}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RetailerRow({ retailer, onPress }) {
  const meta = ACTION_META[retailer.action_code] || ACTION_META.LOW_PRIORITY;
  const score = Math.round((retailer.opportunity_score || 0) * 100);

  return (
    <TouchableOpacity style={[styles.row, Shadow.sm]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.rowAccent, { backgroundColor: meta.color }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowId} numberOfLines={1}>{retailer.retailer_id}</Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>
              {meta.icon} {retailer.action_code?.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.rowLocation}>📍 {retailer.tehsil}, {retailer.district}</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: meta.color }]} />
          </View>
          <Text style={[styles.scoreNum, { color: meta.color }]}>{score}%</Text>
        </View>
        {retailer.top_reason_text ? (
          <Text style={styles.reason} numberOfLines={2}>"{retailer.top_reason_text}"</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const netInfo = useNetInfo();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [repId, setRepId] = useState('REP_0001');
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState(null);

  const loadFromStorage = useCallback(async () => {
    const stored = await getAllRetailers();
    if (stored?.length > 0) { setRetailers(stored); setLastSync('Cached'); return true; }
    return false;
  }, []);

  const loadFromAPI = useCallback(async () => {
    try {
      await initializeConfigService();
      const currentRepId = await getCurrentRepId();
      setRepId(currentRepId);
      const { baseUrl, token } = await getApiConfig();
      const scoreDate = new Date().toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}/reps/${currentRepId}/priority-list?score_date=${scoreDate}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const list = data.retailers || [];
      setRetailers(list);
      if (list.length > 0) {
        const { saveDeltaRecords } = await import('../services/dbService');
        await saveDeltaRecords(list);
      }
      setLastSync(new Date().toLocaleTimeString());
      return true;
    } catch { return false; }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const online = await checkNetworkStatus();
    setIsOnline(online);
    if (online) { const ok = await loadFromAPI(); if (!ok) await loadFromStorage(); }
    else await loadFromStorage();
    setPendingCount(await getPendingCount());
    setLoading(false);
  }, [loadFromAPI, loadFromStorage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const online = await checkNetworkStatus();
    setIsOnline(online);
    if (online) {
      await syncPendingVisits();
      const id = await getCurrentRepId();
      await pullDeltaScores(id, new Date().toISOString().split('T')[0]);
      await loadFromAPI();
    } else await loadFromStorage();
    setPendingCount(await getPendingCount());
    setRefreshing(false);
  }, [loadFromAPI, loadFromStorage]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (netInfo.isConnected !== null) {
      setIsOnline(netInfo.isConnected);
      if (netInfo.isConnected) syncPendingVisits();
    }
  }, [netInfo.isConnected]);

  const highCount  = retailers.filter(r => r.priority <= 2).length;
  const alertCount = retailers.filter(r => ['URGENT_RESTOCK', 'OVERDUE_HIGH', 'ANOMALY_ALERT'].includes(r.action_code)).length;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AppColors.primaryMid} />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>AgriPulse AI</Text>
            <Text style={styles.headerTitle}>Field Dashboard</Text>
          </View>
          <View style={[styles.onlinePill, { backgroundColor: isOnline ? '#a5d6a7' : '#ef9a9a' }]}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? AppColors.success : AppColors.danger }]} />
            <Text style={[styles.onlineText, { color: isOnline ? AppColors.success : AppColors.danger }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.repRow}>
          <Text style={styles.repText}>👤 {repId}</Text>
          {lastSync ? <Text style={styles.syncText}>Synced {lastSync}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <StatCard value={retailers.length} label="Total"         color={AppColors.primaryMid} />
          <StatCard value={highCount}        label="High Priority" color={AppColors.warning} />
          <StatCard value={alertCount}       label="Alerts"        color={AppColors.danger} />
          <StatCard value={pendingCount}     label="Pending"       color={AppColors.info} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primaryMid]} />}
        >
          <Text style={styles.sectionTitle}>Priority Retailers</Text>
          {retailers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🌾</Text>
              <Text style={styles.emptyText}>No retailers found.</Text>
              <Text style={styles.emptyHint}>Pull down to refresh.</Text>
            </View>
          ) : (
            retailers.map(r => (
              <RetailerRow key={r.retailer_id} retailer={r} onPress={() => setSelectedRetailer(r)} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <RetailerModal
        retailer={selectedRetailer}
        visible={!!selectedRetailer}
        onClose={() => setSelectedRetailer(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: AppColors.bg },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:   { marginTop: 12, color: AppColors.textMuted, fontSize: 14 },

  header:        { backgroundColor: AppColors.primary, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerEyebrow: { color: '#a5d6a7', fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  headerTitle:   { color: AppColors.white, fontSize: 24, fontWeight: '800', marginTop: 2 },
  onlinePill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  onlineDot:     { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  onlineText:    { fontSize: 12, fontWeight: '700' },

  repRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: AppColors.primaryMid },
  repText:       { color: '#c8e6c9', fontSize: 13, fontWeight: '600' },
  syncText:      { color: '#a5d6a7', fontSize: 11 },

  statsRow:      { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  statCard:      { flex: 1, backgroundColor: AppColors.white, borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3, ...Shadow.sm },
  statValue:     { fontSize: 22, fontWeight: '800' },
  statLabel:     { fontSize: 10, color: AppColors.textMuted, marginTop: 3, fontWeight: '600', textAlign: 'center' },

  list:          { flex: 1, paddingHorizontal: 16 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: AppColors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  row:           { flexDirection: 'row', backgroundColor: AppColors.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  rowAccent:     { width: 5 },
  rowBody:       { flex: 1, padding: 14 },
  rowTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  rowId:         { fontSize: 15, fontWeight: '700', color: AppColors.textPrimary, flex: 1, marginRight: 8 },
  badge:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontSize: 10, fontWeight: '700' },
  rowLocation:   { fontSize: 12, color: AppColors.textMuted, marginBottom: 8 },
  scoreRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBarBg:    { flex: 1, height: 6, backgroundColor: '#e8f5e9', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill:  { height: '100%', borderRadius: 3 },
  scoreNum:      { fontSize: 12, fontWeight: '800', width: 34, textAlign: 'right' },
  reason:        { fontSize: 11, color: AppColors.textMuted, fontStyle: 'italic', marginTop: 6 },

  emptyBox:      { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:     { fontSize: 48, marginBottom: 12 },
  emptyText:     { fontSize: 16, fontWeight: '700', color: AppColors.textSecondary },
  emptyHint:     { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },

  // Modal
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:        { backgroundColor: AppColors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHandle:       { width: 40, height: 4, backgroundColor: AppColors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderLeftWidth: 5, marginHorizontal: 16, marginTop: 8, borderRadius: 8, backgroundColor: AppColors.bg },
  modalRetailerId:   { fontSize: 18, fontWeight: '800', color: AppColors.textPrimary },
  modalLocation:     { fontSize: 12, color: AppColors.textMuted, marginTop: 3 },
  modalScoreBadge:   { width: 56, height: 56, borderRadius: 28, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  modalScoreNum:     { fontSize: 18, fontWeight: '900' },
  modalScoreLabel:   { fontSize: 8, color: AppColors.textMuted, fontWeight: '600' },
  modalBody:         { paddingHorizontal: 16, marginTop: 8 },
  modalActionRow:    { borderRadius: 10, padding: 12, marginBottom: 14 },
  modalActionText:   { fontSize: 13, fontWeight: '700' },
  modalStatsRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modalStat:         { flex: 1, backgroundColor: AppColors.bg, borderRadius: 10, padding: 10, alignItems: 'center' },
  modalStatVal:      { fontSize: 16, fontWeight: '800', color: AppColors.textPrimary },
  modalStatLabel:    { fontSize: 9, color: AppColors.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  modalReasonBox:    { backgroundColor: AppColors.primaryPale, borderRadius: 10, padding: 12, marginBottom: 14 },
  modalReasonLabel:  { fontSize: 10, fontWeight: '700', color: AppColors.primaryMid, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  modalReasonText:   { fontSize: 13, color: AppColors.textSecondary, fontStyle: 'italic' },
  modalSectionTitle: { fontSize: 12, fontWeight: '700', color: AppColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  modalNoVisits:     { fontSize: 13, color: AppColors.textMuted, fontStyle: 'italic', marginBottom: 16 },
  visitRow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  visitDot:          { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  visitOutcome:      { fontSize: 13, fontWeight: '700' },
  visitProduct:      { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  visitTime:         { fontSize: 11, color: AppColors.textMuted, marginTop: 2 },
});
