import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function SyncStatusBar({ lastSync, pendingCount, onForceSync }) {
  const isAllSynced = pendingCount === 0;

  return (
    <View style={[styles.container, { backgroundColor: isAllSynced ? '#1e8449' : '#d35400' }]}>
      <View style={styles.left}>
        <Text style={styles.statusIcon}>{isAllSynced ? '✅' : '⏳'}</Text>
        <View>
          <Text style={styles.statusText}>
            {isAllSynced ? 'All Synced' : `${pendingCount} Pending`}
          </Text>
          <Text style={styles.lastSyncText}>Last sync: {lastSync}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.syncButton} onPress={onForceSync}>
        <Text style={styles.syncButtonText}>Force Sync</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIcon: { fontSize: 20 },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  lastSyncText: { color: '#f0f0f0', fontSize: 11, marginTop: 2 },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});