import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

const STORAGE_KEYS = {
  DOMINANT: '@theme_dominant_60',
  SURFACE: '@theme_surface_30',
  ACCENT: '@theme_accent_10',
  BG_IMAGE: '@app_bg_image',
  OPACITY: '@app_overlay_opacity',
};

// Curated 60-30-10 Presets (Apple-inspired)
export const PALETTE_PRESETS = [
  {
    id: 'apple_classic',
    name: 'Apple Red',
    desc: 'Classic Apple Music clean white with red punch',
    dominant: '#F2F2F7', // 60%
    surface: '#FFFFFF',  // 30%
    accent: '#FF2D55',   // 10%
    isDark: false,
  },
  {
    id: 'deep_midnight',
    name: 'Midnight Pro',
    desc: 'OLED pure dark with electric cyan focal point',
    dominant: '#0B0D11', // 60%
    surface: '#171B22',  // 30%
    accent: '#0A84FF',   // 10%
    isDark: true,
  },
  {
    id: 'emerald_frost',
    name: 'Nordic Mint',
    desc: 'Soft botanical green with vibrant emerald',
    dominant: '#F0FDF4', // 60%
    surface: '#FFFFFF',  // 30%
    accent: '#10B981',   // 10%
    isDark: false,
  },
  {
    id: 'velvet_amethyst',
    name: 'Deep Amethyst',
    desc: 'Rich royal purple with vivid magenta accents',
    dominant: '#11071F', // 60%
    surface: '#20103A',  // 30%
    accent: '#D946EF',   // 10%
    isDark: true,
  },
  {
    id: 'sunset_glow',
    name: 'Warm Sunset',
    desc: 'Creamy warm linen with electric coral pop',
    dominant: '#FAF5EF', // 60%
    surface: '#FFFFFF',  // 30%
    accent: '#F97316',   // 10%
    isDark: false,
  },
  {
    id: 'space_black',
    name: 'Space Grey',
    desc: 'Minimalist stealth monochrome with bright orange',
    dominant: '#18181B', // 60%
    surface: '#27272A',  // 30%
    accent: '#F59E0B',   // 10%
    isDark: true,
  },
];

export const ThemeProvider = ({ children }) => {
  // 60-30-10 Rule:
  // 60% Dominant Background
  const [dominantColor, setDominantColor] = useState('#F2F2F7');
  // 30% Secondary Surfaces (Cards, Navbars, Headers)
  const [surfaceColor, setSurfaceColor] = useState('#FFFFFF');
  // 10% High-Impact Accent (Buttons, Active Icons, Highlights)
  const [accentColor, setAccentColor] = useState('#FF2D55');

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.3);

  // Helper: check if dominant color is dark
  const isDark = () => {
    // Basic luminance check
    const hex = dominantColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 128;
    }
    return false;
  };

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedDom = await AsyncStorage.getItem(STORAGE_KEYS.DOMINANT);
        const storedSurf = await AsyncStorage.getItem(STORAGE_KEYS.SURFACE);
        const storedAcc = await AsyncStorage.getItem(STORAGE_KEYS.ACCENT);
        const storedBg = await AsyncStorage.getItem(STORAGE_KEYS.BG_IMAGE);
        const storedOp = await AsyncStorage.getItem(STORAGE_KEYS.OPACITY);

        if (storedDom) setDominantColor(storedDom);
        if (storedSurf) setSurfaceColor(storedSurf);
        if (storedAcc) setAccentColor(storedAcc);
        if (storedBg) setBackgroundImage(storedBg);
        if (storedOp !== null) setOverlayOpacity(parseFloat(storedOp));
      } catch (e) {
        console.error("Failed to load theme data", e);
      }
    };
    loadTheme();
  }, []);

  const updateDominantColor = async (color) => {
    setDominantColor(color);
    await AsyncStorage.setItem(STORAGE_KEYS.DOMINANT, color);
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
    await AsyncStorage.setItem(STORAGE_KEYS.DOMINANT, preset.dominant);
    await AsyncStorage.setItem(STORAGE_KEYS.SURFACE, preset.surface);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCENT, preset.accent);
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

  return (
    <ThemeContext.Provider value={{ 
      // 60-30-10 Colors
      dominantColor,
      surfaceColor,
      accentColor,
      // Backward compatibility
      themeColor: accentColor,
      // Actions
      updateDominantColor,
      updateSurfaceColor,
      updateAccentColor,
      applyPreset,
      // Background and Opacity
      backgroundImage,
      updateBackgroundImage,
      overlayOpacity,
      updateOverlayOpacity,
      isDark: isDark(),
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
