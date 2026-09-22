/**
 * ============================================================
 * CapacitaHub Claro - Arquitectura de Tokens y Gestor de Temas
 * Soporte para prefers-color-scheme: dark & Identidad Claro
 * ============================================================
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

/**
 * Paleta de Tokens Oficiales Claro
 * Diseñados para garantizar WCAG 2.1 AA en ambos modos.
 */
export const CLARO_DESIGN_TOKENS = {
  brand: {
    primaryRed: '#DA291C',       // Pantone 485 C
    redHover: '#C22418',
    redActive: '#A11B10',
    redDark: '#B31E12',
    redLight: '#FFF1F0',
    // En dark mode, se usa un rojo ligeramente más brillante para texto/bordes:
    redDarkAccessible: '#FF6659',
    redDarkHover: '#F54438',
    navy: '#0B1329',
    darkSlate: '#0F172A',
  },
  light: {
    bgCanvas: '#F4F6F9',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#F8FAFC',
    bgSurfaceElevated: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    borderSubtle: '#F1F5F9',
    borderDefault: '#E2E8F0',
    borderStrong: '#CBD5E1',
    themeColor: '#DA291C',
  },
  dark: {
    bgCanvas: '#0B0F19',
    bgSurface: '#131B2E',
    bgSurfaceSubtle: '#182238',
    bgSurfaceElevated: '#1D2A45',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    borderSubtle: '#1C2740',
    borderDefault: '#263554',
    borderStrong: '#384C74',
    themeColor: '#0B0F19',
  }
} as const;

const THEME_STORAGE_KEY = 'ch_theme_preference';

/**
 * Obtiene la preferencia guardada en localStorage ('system' | 'light' | 'dark')
 */
export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined' || !window.localStorage) return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

/**
 * Detecta si el sistema operativo tiene activado el modo oscuro
 */
export function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Calcula el tema efectivo que se debe renderizar en pantalla
 */
export function getEffectiveTheme(preference: ThemePreference = getStoredThemePreference()): EffectiveTheme {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
}

/**
 * Sincroniza la meta etiqueta theme-color para navegadores móviles
 */
export function syncMetaThemeColor(effectiveTheme: EffectiveTheme): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', effectiveTheme === 'dark' ? '#0B0F19' : '#DA291C');
}

/**
 * Aplica la preferencia al DOM (data-theme, clase dark y meta theme-color)
 */
export function applyTheme(preference: ThemePreference): EffectiveTheme {
  if (typeof document === 'undefined') return 'light';

  const effective = getEffectiveTheme(preference);
  const root = document.documentElement;

  if (preference === 'system') {
    root.removeAttribute('data-theme');
    // Mantiene la clase .dark sincronizada con el sistema para Tailwind selector
    if (effective === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  } else if (preference === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  }

  syncMetaThemeColor(effective);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ch_theme_changed', { detail: { effective, preference, theme: preference } }));
  }
  return effective;
}

/**
 * Guarda la preferencia y la aplica
 */
export function setThemePreference(preference: ThemePreference): EffectiveTheme {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  return applyTheme(preference);
}

// Aliases para compatibilidad directa
export type Theme = ThemePreference;
export const getStoredTheme = getStoredThemePreference;
export const setStoredTheme = setThemePreference;

/**
 * Inicializa la escucha de cambios en prefers-color-scheme a nivel de sistema operativo
 */
export function initThemeListener(onThemeChange?: (effective: EffectiveTheme, pref: ThemePreference) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const pref = getStoredThemePreference();
    if (pref === 'system') {
      const effective = applyTheme('system');
      onThemeChange?.(effective, pref);
    }
  };

  // Inicializar al cargar
  applyTheme(getStoredThemePreference());

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  } else if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(handler);
    return () => (mediaQuery as any).removeListener(handler);
  }

  return () => {};
}
