import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Platform 
} from 'react-native';
import { ThemeContext, PALETTE_PRESETS } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// Swatches for free customization
const CANVAS_SWATCHES = ['#F2F2F7', '#0B0D11', '#18181B', '#F0FDF4', '#FAF5EF', '#11071F', '#0F172A'];
const SURFACE_SWATCHES = ['#FFFFFF', '#171B22', '#27272A', '#DCFCE7', '#FFEDD5', '#20103A', '#1E293B'];
const ACCENT_SWATCHES = ['#FF2D55', '#0A84FF', '#10B981', '#D946EF', '#F97316', '#F59E0B', '#6366F1'];

const OPACITIES = [
  { label: 'Clear', value: 0.15, desc: '15%' },
  { label: 'Balanced', value: 0.35, desc: '35%' },
  { label: 'Soft', value: 0.55, desc: '55%' },
  { label: 'Subtle', value: 0.75, desc: '75%' },
];

export default function SettingsScreen() {
  const { 
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
    isDark
  } = useContext(ThemeContext);

  const [customHex, setCustomHex] = useState('');
  const [activeCustomCategory, setActiveCustomCategory] = useState('accent'); // 'dominant' | 'surface' | 'accent'

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';
  const cardBg = backgroundImage ? 'rgba(255, 255, 255, 0.85)' : surfaceColor;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* 60-30-10 Rule Visualizer Card */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="pie-chart" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>60-30-10 Color Architecture</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Harmonious Apple proportion system
            </Text>
          </View>
        </View>

        {/* Live Visualizer Bar */}
        <View style={styles.ratioBarContainer}>
          <View style={[styles.ratioSegment, { flex: 6, backgroundColor: dominantColor }]}>
            <Text style={styles.ratioText}>60% Canvas</Text>
          </View>
          <View style={[styles.ratioSegment, { flex: 3, backgroundColor: surfaceColor, borderWidth: 1, borderColor: '#ccc' }]}>
            <Text style={[styles.ratioText, { color: '#333' }]}>30% Card</Text>
          </View>
          <View style={[styles.ratioSegment, { flex: 1, backgroundColor: accentColor }]}>
            <Text style={styles.ratioText}>10%</Text>
          </View>
        </View>

        {/* Presets Grid */}
        <Text style={[styles.sectionHeading, { color: textColor }]}>Curated 60-30-10 Presets</Text>
        <View style={styles.presetsGrid}>
          {PALETTE_PRESETS.map(preset => {
            const isSelected = dominantColor === preset.dominant && accentColor === preset.accent;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetPill,
                  { borderColor: isSelected ? accentColor : borderColor, borderWidth: isSelected ? 2 : 1 },
                  isSelected && { backgroundColor: accentColor + '12' }
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
      </View>

      {/* Free Customization Section */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="color-palette" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Freely Customize Palette</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Customize each layer of your 60-30-10 palette
            </Text>
          </View>
        </View>

        {/* 10% Accent Layer */}
        <Text style={[styles.layerTitle, { color: textColor }]}>
          10% Accent Color (Focal Points & Buttons)
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

        {/* 60% Canvas Layer */}
        <Text style={[styles.layerTitle, { color: textColor, marginTop: 18 }]}>
          60% Canvas Color (Main Background)
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

        {/* 30% Surface Layer */}
        <Text style={[styles.layerTitle, { color: textColor, marginTop: 18 }]}>
          30% Surface Color (Cards & Elements)
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

        {/* Custom Hex Code Input */}
        <View style={styles.hexInputContainer}>
          <Text style={[styles.layerTitle, { color: textColor }]}>Apply Any Custom HEX Code</Text>
          <View style={styles.categoryPillsRow}>
            {['dominant', 'surface', 'accent'].map(cat => (
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
                  {cat === 'dominant' ? '60% Canvas' : cat === 'surface' ? '30% Card' : '10% Accent'}
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

      {/* Background Photo & Opacity Section */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="image" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Background Wallpaper</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Upload a personalized photo for the entire app
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
            <Text style={[styles.layerTitle, { color: textColor }]}>Soft Glass White Tint</Text>
            <View style={styles.opacityRow}>
              {OPACITIES.map(item => {
                const isSelected = Math.abs(overlayOpacity - item.value) < 0.05;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.opacityPill,
                      isSelected && { borderColor: accentColor, backgroundColor: accentColor + '18' }
                    ]}
                    onPress={() => updateOverlayOpacity(item.value)}
                  >
                    <Text style={[styles.opacityLabel, isSelected && { color: accentColor, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.opacityDesc}>{item.desc}</Text>
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

      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>About Anti-Music</Text>
        <Text style={[styles.cardSubtitle, { color: subtextColor, marginTop: 4 }]}>
          Minimalist offline music player with 60-30-10 palette customization, sleep timer, and custom playlist folders.
        </Text>
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
    color: '#fff',
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
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  opacityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  opacityDesc: {
    fontSize: 10,
    color: '#888',
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
});
