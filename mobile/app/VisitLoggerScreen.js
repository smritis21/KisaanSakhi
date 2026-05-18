import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import SyncStatusBar from '../src/components/SyncStatusBar';
import { queueVisit, syncPendingVisits, checkNetworkStatus } from '../src/services/syncService';
import { getPendingCount } from '../src/services/dbService';

const OUTCOME_CODES = [
  { code: 'VISIT_COMPLETE', label: 'Visit Completed' },
  { code: 'NOT_AVAILABLE', label: 'Retailer Not Available' },
  { code: 'CLOSED', label: 'Shop Closed' },
  { code: 'REFUSED', label: 'Visit Refused' },
  { code: 'RESCHEDULED', label: 'Rescheduled' },
];

const PRODUCT_RECOMMENDATIONS = [
  'Urea', 'DAP', 'Potash', 'Pesticides', 'Seeds', 'Micro-nutrients', 'Organic Fertilizer',
];

export default function VisitLoggerScreen() {
  const params = useLocalSearchParams();
  const [retailer, setRetailer] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Parse retailer from params
  useEffect(() => {
    if (params.retailer) {
      try {
        const parsed = typeof params.retailer === 'string' 
          ? JSON.parse(params.retailer) 
          : params.retailer;
        setRetailer(parsed);
      } catch (e) {
        console.log('[Visit] Error parsing retailer:', e);
      }
    }
  }, [params.retailer]);

  // Load status once on mount
  useEffect(() => {
    let mounted = true;
    
    async function loadStatus() {
      if (!mounted) return;
      const count = await getPendingCount();
      const online = await checkNetworkStatus();
      if (mounted) {
        setPendingCount(count);
        setIsOnline(online);
      }
    }
    
    loadStatus();
    
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit() {
    if (!outcome) {
      Alert.alert('Required', 'Please select an outcome');
      return;
    }

    setIsSubmitting(true);
    try {
      await queueVisit({
        retailer_id: retailer?.retailer_id || 'UNKNOWN',
        rep_id: 'REP_0016',
        outcome_code: outcome,
        product_recommended: product,
        notes,
      });

      Alert.alert(
        'Visit Logged',
        'Data saved locally. Will sync when online.',
        [{ text: 'OK', onPress: () => {
          setOutcome('');
          setProduct('');
          setNotes('');
        }}]
      );

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
        onForceSync={() => syncPendingVisits()}
      />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>✈️ Offline Mode - Data will sync automatically</Text>
        </View>
      )}

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
});