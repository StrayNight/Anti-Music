import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

const STORAGE_KEYS = {
  MODE: '@app_theme_mode_v1',
  DOMINANT: '@theme_dominant_60',
  SURFACE: '@theme_surface_30',
  ACCENT: '@theme_accent_10',
  BG_IMAGE: '@app_bg_image',
  OPACITY: '@app_overlay_opacity',
  AUDIO_QUALITY: '@app_audio_quality',
  NORMALIZATION: '@app_audio_normalization',
  GAPLESS: '@app_gapless_playback',
};

// Curated 60-30-10 Presets
export const PALETTE_PRESETS = [
  {
    id: 'apple_classic',
    name: 'Apple Red',
    desc: 'Classic Apple Music clean white with red punch',
    dominant: '#F2F2F7',
    surface: '#FFFFFF',
    accent: '#FF2D55',
    isDark: false,
  },
  {
    id: 'deep_midnight',
    name: 'Midnight Pro',
    desc: 'OLED pure dark with electric cyan focal point',
    dominant: '#0B0D11',
    surface: '#171B22',
    accent: '#0A84FF',
    isDark: true,
  },
  {
    id: 'emerald_frost',
    name: 'Nordic Mint',
    desc: 'Soft botanical green with vibrant emerald',
    dominant: '#F0FDF4',
    surface: '#FFFFFF',
    accent: '#10B981',
    isDark: false,
  },
  {
    id: 'velvet_amethyst',
    name: 'Deep Amethyst',
    desc: 'Rich royal purple with vivid magenta accents',
    dominant: '#11071F',
    surface: '#20103A',
    accent: '#D946EF',
    isDark: true,
  },
  {
    id: 'sunset_glow',
    name: 'Warm Sunset',
    desc: 'Creamy warm linen with electric coral pop',
    dominant: '#FAF5EF',
    surface: '#FFFFFF',
    accent: '#F97316',
    isDark: false,
  },
  {
    id: 'space_black',
    name: 'Space Grey',
    desc: 'Minimalist stealth monochrome with bright orange',
    dominant: '#18181B',
    surface: '#27272A',
    accent: '#F59E0B',
    isDark: true,
  },
];

export const ThemeProvider = ({ children }) => {
  // Theme Mode: 'light' | 'dark'
  const [themeMode, setThemeMode] = useState('dark'); // Default to sleek modern dark mode

  // 60-30-10 Rule Colors:
  const [dominantColor, setDominantColor] = useState('#0B0D11');
  const [surfaceColor, setSurfaceColor] = useState('#171B22');
  const [accentColor, setAccentColor] = useState('#FF2D55');

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.3);

  // Standard Music App Settings
  const [audioQuality, setAudioQuality] = useState('high'); // 'high' (320kbps), 'standard' (192kbps), 'saver' (128kbps)
  const [audioNormalization, setAudioNormalization] = useState(true);
  const [gaplessPlayback, setGaplessPlayback] = useState(true);

  const checkIsColorDark = (hexColor) => {
    if (!hexColor) return false;
    const hex = hexColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 128;
    }
    return false;
  };

  // Helper: check if dominant color is dark
  const isDark = () => {
    if (themeMode === 'dark' && checkIsColorDark(dominantColor)) return true;
    if (themeMode === 'light' && !checkIsColorDark(dominantColor)) return false;
    return checkIsColorDark(dominantColor);
  };

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(STORAGE_KEYS.MODE);
        const storedDom = await AsyncStorage.getItem(STORAGE_KEYS.DOMINANT);
        const storedSurf = await AsyncStorage.getItem(STORAGE_KEYS.SURFACE);
        const storedAcc = await AsyncStorage.getItem(STORAGE_KEYS.ACCENT);
        const storedBg = await AsyncStorage.getItem(STORAGE_KEYS.BG_IMAGE);
        const storedOp = await AsyncStorage.getItem(STORAGE_KEYS.OPACITY);
        const storedQuality = await AsyncStorage.getItem(STORAGE_KEYS.AUDIO_QUALITY);
        const storedNorm = await AsyncStorage.getItem(STORAGE_KEYS.NORMALIZATION);
        const storedGapless = await AsyncStorage.getItem(STORAGE_KEYS.GAPLESS);

        if (storedMode) setThemeMode(storedMode);
        if (storedDom) setDominantColor(storedDom);
        if (storedSurf) setSurfaceColor(storedSurf);
        if (storedAcc) setAccentColor(storedAcc);
        if (storedBg) setBackgroundImage(storedBg);
        if (storedOp !== null) setOverlayOpacity(parseFloat(storedOp));
        if (storedQuality) setAudioQuality(storedQuality);
        if (storedNorm !== null) setAudioNormalization(storedNorm === 'true');
        if (storedGapless !== null) setGaplessPlayback(storedGapless === 'true');
      } catch (e) {
        console.error("Failed to load settings data", e);
      }
    };
    loadTheme();
  }, []);

  // Switch between Light and Dark mode
  const setMode = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.MODE, mode);

    if (mode === 'dark') {
      setDominantColor('#0B0D11');
      setSurfaceColor('#171B22');
      await AsyncStorage.setItem(STORAGE_KEYS.DOMINANT, '#0B0D11');
      await AsyncStorage.setItem(STORAGE_KEYS.SURFACE, '#171B22');
    } else {
      setDominantColor('#F2F2F7');
      setSurfaceColor('#FFFFFF');
      await AsyncStorage.setItem(STORAGE_KEYS.DOMINANT, '#F2F2F7');
      await AsyncStorage.setItem(STORAGE_KEYS.SURFACE, '#FFFFFF');
    }
  };

  const updateDominantColor = async (color) => {
    setDominantColor(color);
    await AsyncStorage.setItem(STORAGE_KEYS.DOMINANT, color);
    const dark = checkIsColorDark(color);
    setThemeMode(dark ? 'dark' : 'light');
    await AsyncStorage.setItem(STORAGE_KEYS.MODE, dark ? 'dark' : 'light');
  };

  const updateSurfaceColor = async (color) => {
    setSurfaceColor(color);
    await AsyncStorage.setItem(STORAGE_KEYS.SURFACE, color);
  };

  const updateAccentColor = async (color) => {
    setAccentColor(color);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCENT, color);
  };

  const applyPreset = async (preset) => {
    setDominantColor(preset.dominant);
    setSurfaceColor(preset.surface);
    setAccentColor(preset.accent);
    setThemeMode(preset.isDark ? 'dark' : 'light');
    await AsyncStorage.setItem(STORAGE_KEYS.DOMINANT, preset.dominant);
    await AsyncStorage.setItem(STORAGE_KEYS.SURFACE, preset.surface);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCENT, preset.accent);
    await AsyncStorage.setItem(STORAGE_KEYS.MODE, preset.isDark ? 'dark' : 'light');
  };

  const updateBackgroundImage = async (uri) => {
    setBackgroundImage(uri);
    if (uri) {
      await AsyncStorage.setItem(STORAGE_KEYS.BG_IMAGE, uri);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    }
  };

  const updateOverlayOpacity = async (opacity) => {
    setOverlayOpacity(opacity);
    await AsyncStorage.setItem(STORAGE_KEYS.OPACITY, opacity.toString());
  };

  const updateAudioQuality = async (quality) => {
    setAudioQuality(quality);
    await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_QUALITY, quality);
  };

  const toggleAudioNormalization = async () => {
    const nextVal = !audioNormalization;
    setAudioNormalization(nextVal);
    await AsyncStorage.setItem(STORAGE_KEYS.NORMALIZATION, nextVal.toString());
  };

  const toggleGaplessPlayback = async () => {
    const nextVal = !gaplessPlayback;
    setGaplessPlayback(nextVal);
    await AsyncStorage.setItem(STORAGE_KEYS.GAPLESS, nextVal.toString());
  };

  const resetAllSettings = async () => {
    await AsyncStorage.clear();
    setThemeMode('dark');
    setDominantColor('#0B0D11');
    setSurfaceColor('#171B22');
    setAccentColor('#FF2D55');
    setBackgroundImage(null);
    setOverlayOpacity(0.3);
    setAudioQuality('high');
    setAudioNormalization(true);
    setGaplessPlayback(true);
  };

  return (
    <ThemeContext.Provider value={{ 
      themeMode,
      setMode,
      dominantColor,
      surfaceColor,
      accentColor,
      themeColor: accentColor,
      updateDominantColor,
      updateSurfaceColor,
      updateAccentColor,
      applyPreset,
      backgroundImage,
      updateBackgroundImage,
      overlayOpacity,
      updateOverlayOpacity,
      isDark: isDark(),
      audioQuality,
      updateAudioQuality,
      audioNormalization,
      toggleAudioNormalization,
      gaplessPlayback,
      toggleGaplessPlayback,
      resetAllSettings,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
