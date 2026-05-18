import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1a2e1a',
    background: '#f4f7f4',
    tint: '#2e7d32',
    icon: '#4a7c59',
    tabIconDefault: '#8aab8a',
    tabIconSelected: '#2e7d32',
  },
  dark: {
    text: '#e8f5e9',
    background: '#0d1f0d',
    tint: '#66bb6a',
    icon: '#81c784',
    tabIconDefault: '#4a7c59',
    tabIconSelected: '#66bb6a',
  },
};

export const AppColors = {
  // Primary greens
  primary:       '#1b5e20',
  primaryMid:    '#2e7d32',
  primaryLight:  '#43a047',
  primaryPale:   '#e8f5e9',

  // Accent
  accent:        '#f9a825',
  accentLight:   '#fff8e1',

  // Status
  danger:        '#c62828',
  dangerLight:   '#ffebee',
  warning:       '#e65100',
  warningLight:  '#fff3e0',
  info:          '#1565c0',
  infoLight:     '#e3f2fd',
  success:       '#2e7d32',
  successLight:  '#e8f5e9',

  // Neutrals
  white:         '#ffffff',
  bg:            '#f1f5f1',
  cardBg:        '#ffffff',
  border:        '#dce8dc',
  textPrimary:   '#1a2e1a',
  textSecondary: '#4a6741',
  textMuted:     '#7a9b7a',

  // Action code colours
  URGENT_RESTOCK:   '#c62828',
  OVERDUE_HIGH:     '#ad1457',
  INVESTIGATE_SPIKE:'#6a1b9a',
  OVERDUE_VISIT:    '#e65100',
  ANOMALY_ALERT:    '#bf360c',
  STANDARD_VISIT:   '#1565c0',
  LOW_PRIORITY:     '#2e7d32',
};

export const Shadow = {
  sm: {
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
