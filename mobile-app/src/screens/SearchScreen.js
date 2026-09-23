import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
  ScrollView 
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ThemeContext } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const { 
    dominantColor, 
    surfaceColor, 
    accentColor, 
    backgroundImage, 
    isDark 
  } = useContext(ThemeContext);

  const { addSongToLibrary } = useContext(PlaylistContext);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';
  const cardBg = backgroundImage ? 'rgba(255, 255, 255, 0.85)' : surfaceColor;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      alert(`${title}: ${msg}`);
    }
  };

  const handleDownload = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      showAlert("Missing Link", "Please paste a YouTube URL to download.");
      return;
    }

    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      showAlert("Invalid Link", "Please paste a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }

    setLoading(true);
    setStatusMessage('Connecting to Python server & converting audio...');

    try {
      const BACKEND_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.19.227.173:8000';
      const targetUrl = `${BACKEND_URL}/download?url=${encodeURIComponent(trimmed)}`;

      const newSong = {
        id: 'song_' + Date.now(),
        title: trimmed.split('v=')[1]?.substring(0, 11) ? `YouTube Track (${trimmed.split('v=')[1].substring(0, 8)})` : 'Downloaded Track',
        artist: 'Offline Audio',
        duration: 'Audio',
        uri: Platform.OS === 'web' ? targetUrl : null,
      };
      await addSongToLibrary(newSong);

      if (Platform.OS === 'web') {
        window.open(targetUrl, '_blank');
        setLoading(false);
        setStatusMessage('✓ Download started and added to your Library!');
        setQuery('');
      } else {
        const fileUri = FileSystem.documentDirectory + `song_${Date.now()}.mp3`;
        const { uri } = await FileSystem.downloadAsync(targetUrl, fileUri);
        newSong.uri = uri;
        setLoading(false);
        setStatusMessage('');
        showAlert("Download Complete", "Saved to offline library: " + uri);
        setQuery('');
      }
    } catch (error) {
      setLoading(false);
      setStatusMessage('');
      console.error(error);
      showAlert("Download Failed", error.message || "Could not reach local server.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Apple Soft Downloader Card */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="cloud-download" size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>YouTube to Audio</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Instant offline extraction
            </Text>
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: textColor }]}>YouTube Video or Song URL</Text>
        
        <View style={[styles.inputWrapper, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}>
          <Ionicons name="link-outline" size={20} color={subtextColor} style={{ marginLeft: 14 }} />
          <TextInput
            style={[styles.softInput, { color: textColor }]}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 10 }}>
              <Ionicons name="close-circle" size={18} color={subtextColor} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Soft Apple Pill CTA */}
        <TouchableOpacity
          style={[styles.applePillButton, { backgroundColor: accentColor }]}
          onPress={handleDownload}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.applePillButtonText}>Download Offline Audio</Text>
            </>
          )}
        </TouchableOpacity>

        {statusMessage ? (
          <View style={[styles.statusBadge, { backgroundColor: accentColor + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: accentColor }]}>{statusMessage}</Text>
          </View>
        ) : null}
      </View>

      {/* Guide Info Card */}
      <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor, marginTop: 18 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="sparkles" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>How It Works</Text>
            <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
              Fast, high-fidelity offline workflow
            </Text>
          </View>
        </View>

        <View style={styles.stepsList}>
          <View style={styles.stepItem}>
            <View style={[styles.stepNumberBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: textColor }]}>
              Copy any video or music link from YouTube.
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepNumberBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: textColor }]}>
              Paste into the box above and tap Download.
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepNumberBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: textColor }]}>
              The Python server extracts clean audio and saves it offline in your Library!
            </Text>
          </View>
        </View>
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
    shadowOpacity: 0.05,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 18,
    borderWidth: 1.5,
    height: 52,
    marginBottom: 14,
  },
  softInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  applePillButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  applePillButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  statusBadge: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepsList: {
    gap: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
