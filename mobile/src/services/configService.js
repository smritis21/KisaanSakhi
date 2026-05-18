const API_BASE_URL = 'http://192.168.1.24:8000/api/v1';
const AUTH_TOKEN = 'agripulse-hackathon-secret-key-2026';
const DEFAULT_REP_ID = 'REP_0016';

export async function getConfig() {
  return {
    apiBaseUrl: API_BASE_URL,
    authToken: AUTH_TOKEN,
    defaultRepId: DEFAULT_REP_ID,
  };
}

export async function getApiConfig() {
  return { baseUrl: API_BASE_URL, token: AUTH_TOKEN };
}

export async function getCurrentRepId() {
  return DEFAULT_REP_ID;
}

export async function getThresholds() {
  return { highPriorityScore: 0.7, mediumPriorityScore: 0.5, overdueVisitDays: 14, stockoutWarningDays: 14 };
}

export async function getDisplayName(featureKey) {
  const names = {
    days_since_last_visit: 'Days since last visit',
    pos_revenue_30d: 'POS revenue (30 days)',
    pos_revenue_mom_growth: 'Revenue growth',
    tilt_stock: 'Tilt stock level',
    days_to_stockout: 'Days to stockout',
    stockout_flag: 'Stockout alert',
    visit_count_30d: 'Visit frequency',
  };
  return names[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export async function isFeatureEnabled() { return true; }
export async function saveConfig() {}
export async function setCurrentRepId() {}
export async function resetConfig() {}
export async function initializeConfigService() { return getConfig(); }

export default { getConfig, getApiConfig, getCurrentRepId, getThresholds, getDisplayName, isFeatureEnabled, saveConfig, setCurrentRepId, resetConfig, initializeConfigService };