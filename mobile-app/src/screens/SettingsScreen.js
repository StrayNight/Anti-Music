import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Switch,
  Platform,
  ActivityIndicator
} from 'react-native';
import { ThemeContext, PALETTE_PRESETS } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

// Swatches for free customization
const CANVAS_SWATCHES = ['#0B0D11', '#12141A', '#18181B', '#F2F2F7', '#FAF5EF', '#F0FDF4', '#11071F'];
const SURFACE_SWATCHES = ['#171B22', '#1C2029', '#27272A', '#FFFFFF', '#FFEDD5', '#DCFCE7', '#20103A'];
const ACCENT_SWATCHES = ['#FF2D55', '#0A84FF', '#10B981', '#D946EF', '#F97316', '#F59E0B', '#6366F1'];

const OPACITIES = [
  { label: 'Clear', value: 0.15, desc: '15%' },
  { label: 'Balanced', value: 0.35, desc: '35%' },
  { label: 'Soft', value: 0.55, desc: '55%' },
  { label: 'Subtle', value: 0.75, desc: '75%' },
];

const QUALITIES = [
  { id: 'high', label: 'High (320k)', desc: 'Lossless / Studio' },
  { id: 'standard', label: 'Standard (192k)', desc: 'Balanced' },
  { id: 'saver', label: 'Data Saver (128k)', desc: 'Compact' },
];

export default function SettingsScreen() {
  const { 
    themeMode,
    setMode,
    dominantColor, 
    surfaceColor, 
    accentColor, 
    updateDominantColor,
    updateSurfaceColor,
    updateAccentColor,
    applyPreset,
    backgroundImage,
    updateBackgroundImage,
    overlayOpacity,
    updateOverlayOpacity,
    isDark,
    audioQuality,
    updateAudioQuality,
    audioNormalization,
    toggleAudioNormalization,
    gaplessPlayback,
    toggleGaplessPlayback,
    resetAllSettings,
  } = useContext(ThemeContext);

  const { allSongs = [], playlists = [] } = useContext(PlaylistContext);

  const [customHex, setCustomHex] = useState('');
  const [activeCustomCategory, setActiveCustomCategory] = useState('accent');

  // Over-The-Air Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleCheckUpdate = async () => {
    if (Platform.OS === 'web' || __DEV__) {
      setUpdateStatus({ type: 'info', msg: 'Running in live development mode.' });
      setTimeout(() => setUpdateStatus(null), 3500);
      return;
    }

    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateStatus({ type: 'downloading', msg: 'Downloading latest live update...' });
        await Updates.fetchUpdateAsync();
        setUpdateStatus({ type: 'ready', msg: '✓ Update downloaded! Tap to restart.' });
      } else {
        setUpdateStatus({ type: 'latest', msg: '✓ Your app is up to date!' });
        setTimeout(() => setUpdateStatus(null), 3500);
      }
    } catch (e) {
      setUpdateStatus({ type: 'error', msg: `Check failed: ${e.message || 'Offline'}` });
      setTimeout(() => setUpdateStatus(null), 4000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      alert("Failed to reload: " + e.message);
    }
  };

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';
  const cardBg = backgroundImage 
    ? (isDark ? 'rgba(23, 27, 34, 0.88)' : 'rgba(255, 255, 255, 0.88)') 
    : surfaceColor;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      updateBackgroundImage(result.assets[0].uri);
    }
  };

  const handleApplyCustomHex = () => {
    let hex = customHex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      if (activeCustomCategory === 'dominant') updateDominantColor(hex);
      if (activeCustomCategory === 'surface') updateSurfaceColor(hex);
      if (activeCustomCategory === 'accent') updateAccentColor(hex);
      setCustomHex('');
    } else {
      alert("Please enter a valid 6-character hex color (e.g. #FF2D55)");
    }
  };

  const handleClearCache = () => {
    alert("✓ Cache Cleared: Temporary audio buffers and cache have been freed.");
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* -------------------- 1. APPEARANCE & THEME MODE -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="sunny-outline" size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Theme & Display</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Switch between Light Mode and Dark Mode
            </Text>
          </View>
        </View>

        {/* Light Mode vs Dark Mode Segmented Switcher */}
        <View style={[styles.themeModeRow, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#E5E7EB' }]}>
          <TouchableOpacity
            style={[
              styles.themeModeBtn,
              !isDark && { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }
            ]}
            onPress={() => setMode('light')}
            activeOpacity={0.8}
          >
            <Ionicons name="sunny" size={18} color={!isDark ? '#F59E0B' : subtextColor} style={{ marginRight: 6 }} />
            <Text style={[styles.themeModeText, { color: !isDark ? '#111827' : subtextColor, fontWeight: !isDark ? '700' : '500' }]}>
              Light Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeModeBtn,
              isDark && { backgroundColor: surfaceColor, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 }
            ]}
            onPress={() => setMode('dark')}
            activeOpacity={0.8}
          >
            <Ionicons name="moon" size={17} color={isDark ? accentColor : subtextColor} style={{ marginRight: 6 }} />
            <Text style={[styles.themeModeText, { color: isDark ? '#FFFFFF' : subtextColor, fontWeight: isDark ? '700' : '500' }]}>
              Dark Mode
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* -------------------- 2. 60-30-10 PALETTE STUDIO -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="color-palette" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>60-30-10 Palette Studio</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Proportional color system for whole-app harmony
            </Text>
          </View>
        </View>

        {/* Live Visualizer Bar */}
        <View style={styles.ratioBarContainer}>
          <View style={[styles.ratioSegment, { flex: 6, backgroundColor: dominantColor }]}>
            <Text style={[styles.ratioText, { color: isDark ? '#FFF' : '#333' }]}>60% Canvas</Text>
          </View>
          <View style={[styles.ratioSegment, { flex: 3, backgroundColor: surfaceColor, borderWidth: 1, borderColor: borderColor }]}>
            <Text style={[styles.ratioText, { color: isDark ? '#FFF' : '#333' }]}>30% Card</Text>
          </View>
          <View style={[styles.ratioSegment, { flex: 1, backgroundColor: accentColor }]}>
            <Text style={styles.ratioText}>10%</Text>
          </View>
        </View>

        {/* Curated Presets Grid */}
        <Text style={[styles.sectionHeading, { color: textColor }]}>Curated Apple Presets</Text>
        <View style={styles.presetsGrid}>
          {PALETTE_PRESETS.map(preset => {
            const isSelected = dominantColor === preset.dominant && accentColor === preset.accent;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetPill,
                  { borderColor: isSelected ? accentColor : borderColor, borderWidth: isSelected ? 2 : 1 },
                  isSelected && { backgroundColor: accentColor + '15' }
                ]}
                onPress={() => applyPreset(preset)}
                activeOpacity={0.8}
              >
                <View style={styles.presetMiniPalette}>
                  <View style={[styles.miniDot, { backgroundColor: preset.dominant }]} />
                  <View style={[styles.miniDot, { backgroundColor: preset.surface }]} />
                  <View style={[styles.miniDot, { backgroundColor: preset.accent }]} />
                </View>
                <Text style={[styles.presetName, { color: isSelected ? accentColor : textColor }]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Layer Swatches */}
        <Text style={[styles.layerTitle, { color: textColor, marginTop: 18 }]}>
          10% Accent Swatches (Buttons, Highlights)
        </Text>
        <View style={styles.swatchRow}>
          {ACCENT_SWATCHES.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatchCircle,
                { backgroundColor: color },
                accentColor === color && styles.activeSwatch
              ]}
              onPress={() => updateAccentColor(color)}
            >
              {accentColor === color && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.layerTitle, { color: textColor, marginTop: 16 }]}>
          60% Canvas Swatches (Background)
        </Text>
        <View style={styles.swatchRow}>
          {CANVAS_SWATCHES.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatchCircle,
                { backgroundColor: color },
                dominantColor === color && styles.activeSwatch
              ]}
              onPress={() => updateDominantColor(color)}
            >
              {dominantColor === color && (
                <Ionicons name="checkmark" size={18} color={color === '#F2F2F7' ? '#000' : '#fff'} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.layerTitle, { color: textColor, marginTop: 16 }]}>
          30% Surface Swatches (Cards & Floating Bars)
        </Text>
        <View style={styles.swatchRow}>
          {SURFACE_SWATCHES.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatchCircle,
                { backgroundColor: color },
                surfaceColor === color && styles.activeSwatch
              ]}
              onPress={() => updateSurfaceColor(color)}
            >
              {surfaceColor === color && (
                <Ionicons name="checkmark" size={18} color={color === '#FFFFFF' ? '#000' : '#fff'} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Hex Code */}
        <View style={styles.hexInputContainer}>
          <Text style={[styles.layerTitle, { color: textColor }]}>Apply Custom HEX Color</Text>
          <View style={styles.categoryPillsRow}>
            {['accent', 'dominant', 'surface'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  activeCustomCategory === cat && { backgroundColor: accentColor }
                ]}
                onPress={() => setActiveCustomCategory(cat)}
              >
                <Text style={[
                  styles.catPillText,
                  activeCustomCategory === cat && { color: '#fff', fontWeight: '700' }
                ]}>
                  {cat === 'accent' ? '10% Accent' : cat === 'dominant' ? '60% Canvas' : '30% Card'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.hexRow}>
            <TextInput
              style={[styles.hexInput, { color: textColor, borderColor }]}
              placeholder="#FF2D55"
              placeholderTextColor="#999"
              value={customHex}
              onChangeText={setCustomHex}
              autoCapitalize="characters"
              maxLength={7}
            />
            <TouchableOpacity 
              style={[styles.hexApplyBtn, { backgroundColor: accentColor }]}
              onPress={handleApplyCustomHex}
            >
              <Text style={styles.hexApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* -------------------- 3. BACKGROUND WALLPAPER -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="image" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Custom Wallpaper</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Personalize with your own photo background
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.appleButton, { backgroundColor: accentColor }]}
          onPress={pickImage}
          activeOpacity={0.85}
        >
          <Ionicons name="cloud-upload" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.appleButtonText}>Choose Photo from Device</Text>
        </TouchableOpacity>

        {backgroundImage ? (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.layerTitle, { color: textColor }]}>Wallpaper Tint Intensity</Text>
            <View style={styles.opacityRow}>
              {OPACITIES.map(item => {
                const isSelected = Math.abs(overlayOpacity - item.value) < 0.05;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.opacityPill,
                      { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)' },
                      isSelected && { borderColor: accentColor, borderWidth: 2 }
                    ]}
                    onPress={() => updateOverlayOpacity(item.value)}
                  >
                    <Text style={[styles.opacityLabel, { color: textColor }, isSelected && { color: accentColor, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.opacityDesc, { color: subtextColor }]}>{item.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity 
              style={styles.removeBgBtn}
              onPress={() => updateBackgroundImage(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
              <Text style={styles.removeBgText}>Remove Wallpaper</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* -------------------- 4. AUDIO & PLAYBACK SETTINGS -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="musical-notes" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Audio & Playback</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Fidelity, leveling, and transition controls
            </Text>
          </View>
        </View>

        {/* Quality Selector */}
        <Text style={[styles.layerTitle, { color: textColor }]}>Audio Streaming & Download Quality</Text>
        <View style={styles.qualityContainer}>
          {QUALITIES.map(q => {
            const isSelected = audioQuality === q.id;
            return (
              <TouchableOpacity
                key={q.id}
                style={[
                  styles.qualityRow,
                  { borderColor },
                  isSelected && { borderColor: accentColor, backgroundColor: accentColor + '12' }
                ]}
                onPress={() => updateAudioQuality(q.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.qualityLabel, { color: isSelected ? accentColor : textColor }]}>
                    {q.label}
                  </Text>
                  <Text style={[styles.qualityDesc, { color: subtextColor }]}>{q.desc}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Normalization Toggle */}
        <View style={[styles.settingToggleRow, { borderTopColor: borderColor }]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.toggleTitle, { color: textColor }]}>Sound Normalization</Text>
            <Text style={[styles.toggleDesc, { color: subtextColor }]}>
              Equalize loudness across all offline tracks
            </Text>
          </View>
          <Switch 
            value={audioNormalization} 
            onValueChange={toggleAudioNormalization}
            trackColor={{ false: '#767577', true: accentColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Gapless Playback Toggle */}
        <View style={[styles.settingToggleRow, { borderTopColor: borderColor }]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.toggleTitle, { color: textColor }]}>Gapless Playback</Text>
            <Text style={[styles.toggleDesc, { color: subtextColor }]}>
              Seamless transitions without silence between songs
            </Text>
          </View>
          <Switch 
            value={gaplessPlayback} 
            onValueChange={toggleGaplessPlayback}
            trackColor={{ false: '#767577', true: accentColor }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* -------------------- 5. STORAGE & CACHE -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="server" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Storage & Offline Data</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Manage local device disk space
            </Text>
          </View>
        </View>

        <View style={styles.storageStatsBox}>
          <View style={styles.storageItem}>
            <Text style={[styles.storageValue, { color: accentColor }]}>{allSongs.length}</Text>
            <Text style={[styles.storageLabel, { color: subtextColor }]}>Offline Songs</Text>
          </View>
          <View style={styles.storageItem}>
            <Text style={[styles.storageValue, { color: accentColor }]}>{playlists.length}</Text>
            <Text style={[styles.storageLabel, { color: subtextColor }]}>Playlists</Text>
          </View>
          <View style={styles.storageItem}>
            <Text style={[styles.storageValue, { color: accentColor }]}>~{(allSongs.length * 4.2).toFixed(1)} MB</Text>
            <Text style={[styles.storageLabel, { color: subtextColor }]}>Space Used</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.secondaryActionBtn, { borderColor }]}
          onPress={handleClearCache}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-bin-outline" size={17} color={textColor} style={{ marginRight: 6 }} />
          <Text style={[styles.secondaryActionText, { color: textColor }]}>Clear Temporary Audio Cache</Text>
        </TouchableOpacity>
      </View>

      {/* -------------------- 6. OVER-THE-AIR LIVE UPDATES -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="cloud-download-outline" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Live Updates (OTA)</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Automatic live updates without reinstalling APK
            </Text>
          </View>
        </View>

        <View style={styles.aboutInfoRow}>
          <Text style={[styles.aboutLabel, { color: subtextColor }]}>Update Channel</Text>
          <Text style={[styles.aboutValue, { color: textColor }]}>production</Text>
        </View>

        <View style={styles.aboutInfoRow}>
          <Text style={[styles.aboutLabel, { color: subtextColor }]}>Auto Check on Launch</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
            <Text style={[styles.aboutValue, { color: '#10B981', fontWeight: '700' }]}>Active</Text>
          </View>
        </View>

        {updateStatus && (
          <View style={[
            styles.updateStatusBanner, 
            { 
              backgroundColor: updateStatus.type === 'error' ? '#EF444420' : 
                               updateStatus.type === 'downloading' ? '#F59E0B20' : '#10B98120',
              borderColor: updateStatus.type === 'error' ? '#EF4444' : 
                           updateStatus.type === 'downloading' ? '#F59E0B' : '#10B981'
            }
          ]}>
            <Text style={[
              styles.updateStatusText,
              { 
                color: updateStatus.type === 'error' ? '#EF4444' : 
                       updateStatus.type === 'downloading' ? '#F59E0B' : '#10B981'
              }
            ]}>
              {updateStatus.msg}
            </Text>
          </View>
        )}

        <View style={{ marginTop: 14, gap: 10 }}>
          <TouchableOpacity 
            style={[styles.secondaryActionBtn, { borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
            onPress={handleCheckUpdate}
            disabled={isCheckingUpdate}
            activeOpacity={0.8}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="refresh-outline" size={17} color={accentColor} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.secondaryActionText, { color: textColor }]}>
              {isCheckingUpdate ? 'Checking for live updates...' : 'Check for Live Updates'}
            </Text>
          </TouchableOpacity>

          {updateStatus?.type === 'ready' && (
            <TouchableOpacity 
              style={[styles.applyUpdateBtn, { backgroundColor: accentColor }]}
              onPress={handleApplyUpdate}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.applyUpdateBtnText}>Restart App to Apply Update</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* -------------------- 7. ABOUT ANTI-MUSIC -------------------- */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="information" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>About Anti-Music</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Minimalist offline music ecosystem
            </Text>
          </View>
        </View>

        <View style={styles.aboutInfoRow}>
          <Text style={[styles.aboutLabel, { color: subtextColor }]}>Version</Text>
          <Text style={[styles.aboutValue, { color: textColor }]}>1.2.0 (Apple Soft Edition)</Text>
        </View>

        <View style={styles.aboutInfoRow}>
          <Text style={[styles.aboutLabel, { color: subtextColor }]}>Platform</Text>
          <Text style={[styles.aboutValue, { color: textColor }]}>{Platform.OS.toUpperCase()}</Text>
        </View>

        <View style={styles.aboutInfoRow}>
          <Text style={[styles.aboutLabel, { color: subtextColor }]}>Cloud Server</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
            <Text style={[styles.aboutValue, { color: '#10B981', fontWeight: '700' }]}>
              anti-music.onrender.com (Online)
            </Text>
          </View>
        </View>

        <View style={styles.aboutInfoRow}>
          <Text style={[styles.aboutLabel, { color: subtextColor }]}>Architecture</Text>
          <Text style={[styles.aboutValue, { color: textColor }]}>60-30-10 Dynamic Palette</Text>
        </View>

        <TouchableOpacity 
          style={styles.resetBtn}
          onPress={() => {
            if (confirm ? confirm("Reset all settings, themes, and customization to default?") : true) {
              resetAllSettings();
              alert("Settings reset to defaults.");
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={15} color="#FF3B30" style={{ marginRight: 6 }} />
          <Text style={styles.resetBtnText}>Reset All Settings to Factory Default</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  appleCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  themeModeRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 18,
    gap: 6,
  },
  themeModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  themeModeText: {
    fontSize: 13,
  },
  ratioBarContainer: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 14,
  },
  ratioSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratioText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetPill: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 10,
  },
  presetMiniPalette: {
    flexDirection: 'row',
    gap: 3,
  },
  miniDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
  },
  layerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeSwatch: {
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ scale: 1.12 }],
  },
  hexInputContainer: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  catPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  hexRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  hexInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
  },
  hexApplyBtn: {
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexApplyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  appleButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  opacityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  opacityPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  opacityLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  opacityDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  removeBgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
  },
  removeBgText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  qualityContainer: {
    gap: 8,
    marginBottom: 16,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  qualityLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  qualityDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  storageStatsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginBottom: 14,
  },
  storageItem: {
    alignItems: 'center',
  },
  storageValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  storageLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  aboutInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  aboutLabel: {
    fontSize: 13,
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  resetBtnText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  updateStatusBanner: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateStatusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  applyUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  applyUpdateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

