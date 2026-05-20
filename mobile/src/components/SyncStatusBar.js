import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppColors, Shadow } from '../../constants/theme';

export default function SyncStatusBar({ lastSync, pendingCount, onForceSync }) {
  const [syncing, setSyncing] = useState(false);
  const allSynced = pendingCount === 0;

  async function handleSync() {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1200));
    await onForceSync();
    setSyncing(false);
  }

  return (
    <View style={[styles.container, Shadow.sm]}>
      <View style={[styles.indicator, { backgroundColor: syncing ? AppColors.warning : allSynced ? AppColors.success : AppColors.warning }]} />
      <View style={styles.textGroup}>
        <Text style={styles.status}>
          {syncing ? 'Syncing...' : allSynced ? '✓ All synced' : `${pendingCount} pending upload${pendingCount > 1 ? 's' : ''}`}
        </Text>
        {lastSync ? <Text style={styles.sub}>Last sync: {lastSync}</Text> : null}
      </View>
      <TouchableOpacity style={[styles.btn, syncing && { opacity: 0.6 }]} onPress={handleSync} disabled={syncing} activeOpacity={0.75}>
        {syncing
          ? <ActivityIndicator size="small" color={AppColors.primaryMid} />
          : <Text style={styles.btnText}>Sync now</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  textGroup: { flex: 1 },
  status: { fontSize: 13, fontWeight: '700', color: AppColors.textPrimary },
  sub: { fontSize: 11, color: AppColors.textMuted, marginTop: 1 },
  btn: {
    backgroundColor: AppColors.primaryPale,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  btnText: { color: AppColors.primaryMid, fontWeight: '700', fontSize: 12 },
});
