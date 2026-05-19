import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import SyncStatusBar from '../components/SyncStatusBar';
import { queueVisit, syncPendingVisits, checkNetworkStatus } from '../services/syncService';
import { getPendingCount } from '../services/dbService';

const OUTCOME_CODES = [
  { code: 'VISIT_COMPLETE', label: 'Visit Completed' },
  { code: 'NOT_AVAILABLE', label: 'Retailer Not Available' },
  { code: 'CLOSED', label: 'Shop Closed' },
  { code: 'REFUSED', label: 'Visit Refused' },
  { code: 'RESCHEDULED', label: 'Rescheduled' },
];

const PRODUCT_RECOMMENDATIONS = [
  'Urea',
  'DAP',
  'Potash',
  'Pesticides',
  'Seeds',
  'Micro-nutrients',
  'Organic Fertilizer',
];

export default function VisitLoggerScreen({ route }) {
  const params = route?.params || {};
  const [retailer, setRetailer] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    console.log('[Visit] params received:', JSON.stringify(params).substring(0, 200));
    
    if (params.retailer) {
      try {
        let parsed = params.retailer;
        if (typeof params.retailer === 'string') {
          // Try to parse as JSON
          try {
            parsed = JSON.parse(params.retailer);
          } catch (e) {
            // If JSON parse fails, it might already be an object stringified
            console.log('[Visit] JSON parse failed, trying eval');
            parsed = eval('(' + params.retailer + ')');
          }
        }
        setRetailer(parsed);
        console.log('[Visit] Parsed retailer:', parsed?.retailer_id);
      } catch (e) {
        console.log('[Visit] Error parsing retailer:', e);
      }
    }
  }, [params]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    const count = await getPendingCount();
    const online = await checkNetworkStatus();
    setPendingCount(count);
    setIsOnline(online);
  }

  async function handleSubmit() {
    if (!outcome) {
      Alert.alert('Required', 'Please select an outcome');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use retailer from state
      console.log('[Visit] retailer from state:', retailer?.retailer_id);
      
      await queueVisit({
        retailer_id: retailer?.retailer_id || 'UNKNOWN',
        rep_id: 'REP_0001',
        outcome_code: outcome,
        product_recommended: product,
        notes,
      });

      const msg = pendingCount === 0 ? 'Visit saved! Will sync when online.' : `Visit queued (${pendingCount + 1} pending)`;
      if (Platform.OS === 'web') {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
        setOutcome(''); setProduct(''); setNotes('');
        loadStatus();
      } else {
        Alert.alert('Visit Logged', msg, [{ text: 'OK', onPress: () => { setOutcome(''); setProduct(''); setNotes(''); loadStatus(); } }]);
      }

      if (isOnline) {
        syncPendingVisits();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save visit: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Retailer Visit</Text>
        {retailer && <Text style={styles.retailerName}>📍 {retailer.retailer_name || retailer.retailer_id}</Text>}
      </View>

      <SyncStatusBar
        pendingCount={pendingCount}
        onForceSync={() => syncPendingVisits().then(loadStatus)}
      />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>✈️ Offline Mode - Data will sync automatically</Text>
        </View>
      )}

      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✅ {successMsg}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Visit Outcome *</Text>
        <View style={styles.chipGroup}>
          {OUTCOME_CODES.map((o) => (
            <TouchableOpacity
              key={o.code}
              style={[styles.chip, outcome === o.code && styles.chipSelected]}
              onPress={() => setOutcome(o.code)}
            >
              <Text style={[styles.chipText, outcome === o.code && styles.chipTextSelected]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Product Recommended</Text>
        <View style={styles.chipGroup}>
          {PRODUCT_RECOMMENDATIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, product === p && styles.chipSelected]}
              onPress={() => setProduct(p)}
            >
              <Text style={[styles.chipText, product === p && styles.chipTextSelected]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any additional notes..."
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isOnline ? '💾 Save & Sync' : '💾 Save (Offline)'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#1a5276', padding: 20, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  retailerName: { color: '#aed6f1', fontSize: 14, marginTop: 4 },
  offlineBanner: { backgroundColor: '#f39c12', padding: 10, alignItems: 'center' },
  offlineText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#e0e0e0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: '#1a5276' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  notesInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#1a5276', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { backgroundColor: '#95a5a6' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  successBanner: { backgroundColor: '#27ae60', padding: 12, alignItems: 'center' },
  successText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});