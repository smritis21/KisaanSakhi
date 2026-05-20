import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import SyncStatusBar from '../components/SyncStatusBar';
import { initDb, getPriorityList, getPendingCount } from '../services/dbService';
import { syncPendingVisits, checkNetworkStatus, pullDeltaScores } from '../services/syncService';
import { AppColors, Shadow } from '../../constants/theme';

const ACTION_META = {
  URGENT_RESTOCK:    { color: AppColors.danger,           bg: AppColors.dangerLight,  icon: '🚨', label: 'Urgent Restock' },
  OVERDUE_HIGH:      { color: AppColors.OVERDUE_HIGH,     bg: '#fce4ec',              icon: '⚠️', label: 'Overdue High' },
  INVESTIGATE_SPIKE: { color: AppColors.INVESTIGATE_SPIKE,bg: '#f3e5f5',              icon: '🔍', label: 'Investigate Spike' },
  OVERDUE_VISIT:     { color: AppColors.warning,          bg: AppColors.warningLight, icon: '📅', label: 'Overdue Visit' },
  ANOMALY_ALERT:     { color: AppColors.ANOMALY_ALERT,    bg: '#fbe9e7',              icon: '⚡', label: 'Anomaly Alert' },
  STANDARD_VISIT:    { color: AppColors.info,             bg: AppColors.infoLight,    icon: '📋', label: 'Standard Visit' },
  LOW_PRIORITY:      { color: AppColors.success,          bg: AppColors.successLight, icon: '✅', label: 'Low Priority' },
};

function ScoreArc({ score }) {
  const meta = score >= 70 ? { color: AppColors.success } : score >= 55 ? { color: AppColors.warning } : { color: AppColors.textMuted };
  return (
    <View style={styles.scoreArc}>
      <Text style={[styles.scoreArcNum, { color: meta.color }]}>{score}</Text>
      <Text style={styles.scoreArcLabel}>opportunity</Text>
      <Text style={styles.scoreArcHint}>↑ higher = better</Text>
    </View>
  );
}

function SHAPCard({ reasons }) {
  if (!reasons?.length) return null;
  return (
    <View style={styles.shapBox}>
      <Text style={styles.shapTitle}>🔍 Why this score?</Text>
      {reasons.map((r, i) => {
        const sv = r.shap ?? r.impact ?? 0;
        const label = r.display || r.feature || '';
        const positive = sv > 0;
        return (
          <View key={i} style={styles.shapRow}>
            <View style={[styles.shapBar, {
              width: `${Math.min(Math.abs(sv) * 200, 100)}%`,
              backgroundColor: positive ? AppColors.primaryPale : AppColors.dangerLight,
            }]} />
            <Text style={styles.shapFeature} numberOfLines={1}>{label}</Text>
            <Text style={[styles.shapVal, { color: positive ? AppColors.success : AppColors.danger }]}>
              {positive ? '▲' : '▼'} {Math.abs(sv).toFixed(3)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RetailerCard({ retailer, onLogVisit }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[retailer.action_code] || ACTION_META.LOW_PRIORITY;
  const score = Math.round((retailer.opportunity_score || 0) * 100);

  return (
    <View style={[styles.card, Shadow.md]}>
      {/* Priority ribbon */}
      <View style={[styles.ribbon, { backgroundColor: meta.color }]}>
        <Text style={styles.ribbonText}>#{retailer.priority}  {meta.icon} {meta.label}</Text>
      </View>

      <View style={styles.cardInner}>
        {/* Left: info */}
        <View style={styles.cardLeft}>
          <Text style={styles.retailerName} numberOfLines={2}>
            {retailer.retailer_name || retailer.retailer_id}
          </Text>
          <Text style={styles.location}>📍 {retailer.tehsil}, {retailer.district}</Text>

          {retailer.anomaly_flag === 1 && (
            <View style={styles.anomalyChip}>
              <Text style={styles.anomalyText}>⚡ Anomaly detected</Text>
            </View>
          )}

          <Text style={styles.actionLabel} numberOfLines={2}>
            🎯 {retailer.action_label || 'Schedule Visit'}
          </Text>
        </View>

        {/* Right: score */}
        <ScoreArc score={score} />
      </View>

      {retailer.top_reason_text ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>"{retailer.top_reason_text}"</Text>
        </View>
      ) : null}

      {/* Expand / collapse */}
      <TouchableOpacity style={styles.expandRow} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.expandText}>{expanded ? '▲ Hide AI explanation' : '▼ Show AI explanation'}</Text>
      </TouchableOpacity>

      {expanded && <SHAPCard reasons={retailer.shap_reasons} />}

      <TouchableOpacity style={[styles.logBtn, { backgroundColor: meta.color }]} onPress={() => onLogVisit(retailer)} activeOpacity={0.85}>
        <Text style={styles.logBtnText}>📝 Log Visit</Text>
      </TouchableOpacity>
    </View>
  );
}

const REP_ID = 'REP_0016';

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
      if (netInfo.isConnected) await pullDeltaScores(REP_ID, new Date().toISOString().split('T')[0]);
      await loadData();
    }
    init();
  }, []);

  useEffect(() => {
    if (netInfo.isConnected) {
      syncPendingVisits();
      pullDeltaScores(REP_ID, new Date().toISOString().split('T')[0]).then(loadData);
    }
  }, [netInfo.isConnected]);

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const list = await getPriorityList(REP_ID, today);
    setRetailers(list);
    setPendingCount(await getPendingCount());
    setLastSync(new Date().toLocaleTimeString());
  }

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

  function handleLogVisit(retailer) {
    router.push({ pathname: '/(tabs)/VisitLoggerScreen', params: { retailer: JSON.stringify(retailer) } });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>AgriPulse AI</Text>
          <Text style={styles.headerTitle}>Priority List</Text>
          <Text style={styles.headerRep}>👤 {REP_ID}</Text>
        </View>
        <View style={[styles.onlinePill, { backgroundColor: netInfo.isConnected ? '#a5d6a7' : '#ef9a9a' }]}>
          <View style={[styles.onlineDot, { backgroundColor: netInfo.isConnected ? AppColors.success : AppColors.danger }]} />
          <Text style={[styles.onlineText, { color: netInfo.isConnected ? AppColors.success : AppColors.danger }]}>
            {netInfo.isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <SyncStatusBar lastSync={lastSync} pendingCount={pendingCount} onForceSync={() => syncPendingVisits().then(loadData)} />

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primaryMid]} />}
      >
        {retailers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🌾</Text>
            <Text style={styles.emptyText}>No retailers assigned.</Text>
            <Text style={styles.emptyHint}>Pull down to sync.</Text>
          </View>
        ) : (
          retailers.map(r => <RetailerCard key={r.retailer_id} retailer={r} onLogVisit={handleLogVisit} />)
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

  list:           { flex: 1, paddingHorizontal: 14, paddingTop: 4 },

  card:           { backgroundColor: AppColors.white, borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  ribbon:         { paddingHorizontal: 14, paddingVertical: 7 },
  ribbonText:     { color: AppColors.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  cardInner:      { flexDirection: 'row', padding: 14, paddingTop: 12 },
  cardLeft:       { flex: 1, marginRight: 12 },
  retailerName:   { fontSize: 16, fontWeight: '800', color: AppColors.textPrimary, marginBottom: 3 },
  location:       { fontSize: 12, color: AppColors.textMuted, marginBottom: 8 },
  anomalyChip:    { alignSelf: 'flex-start', backgroundColor: '#fbe9e7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  anomalyText:    { fontSize: 11, color: AppColors.ANOMALY_ALERT, fontWeight: '700' },
  actionLabel:    { fontSize: 12, color: AppColors.textSecondary, fontWeight: '600' },

  scoreArc:       { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.bg },
  scoreArcNum:    { fontSize: 20, fontWeight: '900' },
  scoreArcLabel:  { fontSize: 8, color: AppColors.textMuted, fontWeight: '600' },
  scoreArcHint:   { fontSize: 7, color: AppColors.textMuted },

  reasonBox:      { marginHorizontal: 14, marginBottom: 10, backgroundColor: AppColors.bg, borderRadius: 8, padding: 10 },
  reasonText:     { fontSize: 12, color: AppColors.textMuted, fontStyle: 'italic' },

  expandRow:      { borderTopWidth: 1, borderTopColor: AppColors.border, paddingVertical: 10, alignItems: 'center' },
  expandText:     { fontSize: 12, color: AppColors.primaryMid, fontWeight: '700' },

  shapBox:        { margin: 14, marginTop: 0, backgroundColor: AppColors.bg, borderRadius: 10, padding: 12 },
  shapTitle:      { fontSize: 13, fontWeight: '700', color: AppColors.textPrimary, marginBottom: 10 },
  shapRow:        { marginBottom: 8 },
  shapBar:        { height: 4, borderRadius: 2, marginBottom: 4 },
  shapFeature:    { fontSize: 12, color: AppColors.textSecondary, flex: 1 },
  shapVal:        { fontSize: 12, fontWeight: '700' },

  logBtn:         { margin: 14, marginTop: 4, borderRadius: 10, padding: 13, alignItems: 'center' },
  logBtnText:     { color: AppColors.white, fontWeight: '800', fontSize: 15 },

  emptyBox:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 16, fontWeight: '700', color: AppColors.textSecondary },
  emptyHint:      { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },
});
