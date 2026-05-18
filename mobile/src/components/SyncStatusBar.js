import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppColors, Shadow } from '../../constants/theme';

export default function SyncStatusBar({ lastSync, pendingCount, onForceSync }) {
  const allSynced = pendingCount === 0;

  return (
    <View style={[styles.container, Shadow.sm]}>
      <View style={[styles.indicator, { backgroundColor: allSynced ? AppColors.success : AppColors.warning }]} />
      <View style={styles.textGroup}>
        <Text style={styles.status}>
          {allSynced ? '✓ All synced' : `${pendingCount} pending upload${pendingCount > 1 ? 's' : ''}`}
        </Text>
        {lastSync ? (
          <Text style={styles.sub}>Last sync: {lastSync}</Text>
        ) : null}
      </View>
      <TouchableOpacity style={styles.btn} onPress={onForceSync} activeOpacity={0.75}>
        <Text style={styles.btnText}>Sync now</Text>
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
