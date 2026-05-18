/**
 * AgriPulse Mobile - Dynamic Configuration Service
 * Loads config from backend API or local storage
 */

const CONFIG_STORAGE_KEY = 'agripulse_config';
const DEFAULT_CONFIG = {
  apiBaseUrl: 'http://192.168.1.24:8000/api/v1',
  authToken: 'agripulse-hackathon-secret-key-2026',
  defaultRepId: 'REP_0001',
  syncIntervalMinutes: 5,
  maxOfflineRecords: 1000,
  cacheTtlHours: 24,
  featureFlags: {
    showAnomalyAlerts: true,
    showShapReasons: true,
    enableRouteOptimization: true,
  },
  thresholds: {
    highPriorityScore: 0.7,
    mediumPriorityScore: 0.5,
    overdueVisitDays: 14,
    stockoutWarningDays: 14,
  },
  displayNames: {
    days_since_last_visit: 'Days since last visit',
    pos_revenue_30d: 'POS revenue (30 days)',
    pos_revenue_mom_growth: 'Revenue growth',
    tilt_stock: 'Tilt stock level',
    days_to_stockout: 'Days to stockout',
    stockout_flag: 'Stockout alert',
    visit_count_30d: 'Visit frequency',
  },
};

// Load config from secure storage or use defaults
export async function getConfig() {
  try {
    const stored = await SecureStore.getItemAsync(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (error) {
    console.warn('[Config] Failed to load stored config:', error);
  }
  return DEFAULT_CONFIG;
}

// Save config to secure storage
export async function saveConfig(config) {
  try {
    await SecureStore.setItemAsync(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[Config] Failed to save config:', error);
  }
}

// Get API configuration
export async function getApiConfig() {
  const config = await getConfig();
  return {
    baseUrl: config.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
    token: config.authToken || DEFAULT_CONFIG.authToken,
  };
}

// Get current rep ID (can be changed at runtime)
export async function getCurrentRepId() {
  const config = await getConfig();
  return config.defaultRepId || DEFAULT_CONFIG.defaultRepId;
}

// Set rep ID
export async function setCurrentRepId(repId) {
  const config = await getConfig();
  config.defaultRepId = repId;
  await saveConfig(config);
  return repId;
}

// Get threshold values
export async function getThresholds() {
  const config = await getConfig();
  return config.thresholds || DEFAULT_CONFIG.thresholds;
}

// Get display name for a feature
export async function getDisplayName(featureKey) {
  const config = await getConfig();
  return config.displayNames?.[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Check if a feature flag is enabled
export async function isFeatureEnabled(flagName) {
  const config = await getConfig();
  return config.featureFlags?.[flagName] ?? true;
}

// Reset to defaults
export async function resetConfig() {
  try {
    await SecureStore.deleteItemAsync(CONFIG_STORAGE_KEY);
  } catch (error) {
    console.warn('[Config] Failed to reset config:', error);
  }
  return DEFAULT_CONFIG;
}

// Import SecureStore at runtime to avoid issues
let SecureStore;
export async function initializeConfigService() {
  const module = await import('expo-secure-store');
  SecureStore = module;
  return getConfig();
}

export default {
  getConfig,
  saveConfig,
  getApiConfig,
  getCurrentRepId,
  setCurrentRepId,
  getThresholds,
  getDisplayName,
  isFeatureEnabled,
  resetConfig,
  initializeConfigService,
};