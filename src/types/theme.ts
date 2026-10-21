// Theme color settings interface
export interface ThemeColors {
  // Main accent color
  accent: string;

  // Dark theme
  darkBackground: string;
  darkSurface: string;
  darkText: string;
  darkTextSecondary: string;

  // Light theme
  lightBackground: string;
  lightSurface: string;
  lightText: string;
  lightTextSecondary: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
}

export interface ThemeSettings extends ThemeColors {
  id?: number;
  updated_at?: string;
}

// Enabled themes settings
export interface EnabledThemes {
  dark: boolean;
  light: boolean;
}

// Кабинет светлый («салфетка»): тёмную тему оператор может включить в админке.
export const DEFAULT_ENABLED_THEMES: EnabledThemes = {
  dark: false,
  light: true,
};

// Default theme colors
export const DEFAULT_THEME_COLORS: ThemeColors = {
  accent: '#1d3c9e',

  darkBackground: '#0a0f1a',
  darkSurface: '#0f172a',
  darkText: '#f1f5f9',
  darkTextSecondary: '#94a3b8',

  lightBackground: '#f4f4ef',
  lightSurface: '#fdfdfb',
  lightText: '#23252b',
  lightTextSecondary: '#5d606a',

  success: '#1f7a43',
  warning: '#c27c0e',
  error: '#b3261e',
};

// Color shade levels for palette generation
export const SHADE_LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type ShadeLevel = (typeof SHADE_LEVELS)[number];

export type ColorPalette = Record<ShadeLevel | 850, string>;
