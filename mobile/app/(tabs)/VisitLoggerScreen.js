import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import SyncStatusBar from '../../src/components/SyncStatusBar';
import { queueVisit, syncPendingVisits, checkNetworkStatus } from '../../src/services/syncService';
import { getPendingCount } from '../../src/services/dbService';
import { AppColors, Shadow } from '../../constants/theme';

const OUTCOME_CODES = [
  { code: 'VISIT_COMPLETE', label: '✅ Completed',   color: AppColors.success },
  { code: 'NOT_AVAILABLE',  label: '🚫 Not Available', color: AppColors.warning },
  { code: 'CLOSED',         label: '🔒 Shop Closed',  color: AppColors.textMuted },
  { code: 'REFUSED',        label: '❌ Refused',      color: AppColors.danger },
  { code: 'RESCHEDULED',    label: '📅 Rescheduled',  color: AppColors.info },
];

const PRODUCTS = ['Urea', 'DAP', 'Potash', 'Pesticides', 'Seeds', 'Micro-nutrients', 'Organic Fertilizer'];

export default function VisitLoggerScreen() {
  const params = useLocalSearchParams();
  const [retailer, setRetailer] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (params.retailer) {
      try {
        setRetailer(typeof params.retailer === 'string' ? JSON.parse(params.retailer) : params.retailer);
      } catch (e) { console.log('[Visit] parse error:', e); }
    }
  }, [params.retailer]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const count = await getPendingCount();
      const online = await checkNetworkStatus();
      if (mounted) { setPendingCount(count); setIsOnline(online); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit() {
    if (!outcome) { Alert.alert('Required', 'Please select a visit outcome.'); return; }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      await queueVisit({
        retailer_id: retailer?.retailer_id || 'UNKNOWN',
        rep_id: 'REP_0016',
        outcome_code: outcome,
        product_recommended: product,
        notes,
      });
      if (isOnline) syncPendingVisits();
      const msg = isOnline ? 'Visit saved and syncing…' : 'Saved offline. Will sync when connected.';
      if (Platform.OS === 'web') {
        setIsSubmitting(false);
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
        setOutcome(''); setProduct(''); setNotes('');
      } else {
        setIsSubmitting(false);
        Alert.alert('Visit Logged ✅', msg, [{ text: 'OK', onPress: () => { setOutcome(''); setProduct(''); setNotes(''); } }]);
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Error', err.message);
    }
  }

  const selectedOutcome = OUTCOME_CODES.find(o => o.code === outcome);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>AgriPulse AI</Text>
        <Text style={styles.headerTitle}>Log Visit</Text>
        {retailer && (
          <View style={styles.retailerPill}>
            <Text style={styles.retailerPillText}>📍 {retailer.retailer_name || retailer.retailer_id}</Text>
          </View>
        )}
      </View>

      <SyncStatusBar pendingCount={pendingCount} onForceSync={() => syncPendingVisits()} />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>✈️  Offline — data will sync automatically when connected</Text>
        </View>
      )}
      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✅ {successMsg}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Outcome */}
        <Text style={styles.sectionLabel}>Visit Outcome <Text style={styles.required}>*</Text></Text>
        <View style={styles.chipGrid}>
          {OUTCOME_CODES.map(o => {
            const selected = outcome === o.code;
            return (
              <TouchableOpacity
                key={o.code}
                style={[styles.chip, selected && { backgroundColor: o.color, borderColor: o.color }]}
                onPress={() => setOutcome(o.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Product */}
        <Text style={styles.sectionLabel}>Product Recommended</Text>
        <View style={styles.chipGrid}>
          {PRODUCTS.map(p => {
            const selected = product === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.chip, selected && { backgroundColor: AppColors.primaryMid, borderColor: AppColors.primaryMid }]}
                onPress={() => setProduct(selected ? '' : p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any observations or follow-up notes…"
          placeholderTextColor={AppColors.textMuted}
          multiline
          numberOfLines={4}
        />

        {/* Summary card */}
        {(outcome || product) && (
          <View style={[styles.summaryCard, Shadow.sm]}>
            <Text style={styles.summaryTitle}>Summary</Text>
            {selectedOutcome && (
              <Text style={[styles.summaryLine, { color: selectedOutcome.color }]}>
                {selectedOutcome.label}
              </Text>
            )}
            {product && <Text style={styles.summaryLine}>🌱 {product}</Text>}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting
            ? <ActivityIndicator color={AppColors.white} />
            : <Text style={styles.submitBtnText}>{isOnline ? '💾  Save & Sync' : '💾  Save Offline'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: AppColors.bg },

  header:             { backgroundColor: AppColors.primary, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  headerEyebrow:      { color: '#a5d6a7', fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  headerTitle:        { color: AppColors.white, fontSize: 24, fontWeight: '800', marginTop: 2 },
  retailerPill:       { marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  retailerPillText:   { color: AppColors.white, fontSize: 13, fontWeight: '600' },

  offlineBanner:      { backgroundColor: AppColors.warning, padding: 10, alignItems: 'center' },
  offlineText:        { color: AppColors.white, fontWeight: '700', fontSize: 13 },

  form:               { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  sectionLabel:       { fontSize: 13, fontWeight: '700', color: AppColors.textSecondary, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  required:           { color: AppColors.danger },

  chipGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:               { borderWidth: 1.5, borderColor: AppColors.border, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: AppColors.white },
  chipText:           { fontSize: 13, color: AppColors.textSecondary, fontWeight: '600' },
  chipTextSelected:   { color: AppColors.white, fontWeight: '700' },

  notesInput:         { backgroundColor: AppColors.white, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: AppColors.border, color: AppColors.textPrimary },

  summaryCard:        { backgroundColor: AppColors.white, borderRadius: 12, padding: 14, marginTop: 20, borderLeftWidth: 4, borderLeftColor: AppColors.primaryMid },
  summaryTitle:       { fontSize: 12, fontWeight: '700', color: AppColors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryLine:        { fontSize: 14, fontWeight: '600', color: AppColors.textPrimary, marginBottom: 4 },

  submitBtn:          { backgroundColor: AppColors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled:  { backgroundColor: AppColors.textMuted },
  submitBtnText:      { color: AppColors.white, fontWeight: '800', fontSize: 16 },
  successBanner:      { backgroundColor: '#2e7d32', padding: 12, alignItems: 'center' },
  successText:        { color: '#fff', fontWeight: '700', fontSize: 14 },
});
