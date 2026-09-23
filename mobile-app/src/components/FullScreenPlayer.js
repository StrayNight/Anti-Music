import React, { useContext, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  SafeAreaView, 
  Platform,
  Image 
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';
import { Ionicons } from '@expo/vector-icons';

export default function FullScreenPlayer() {
  const { dominantColor, surfaceColor, accentColor, isDark } = useContext(ThemeContext);
  const { 
    currentlyPlayingSong, 
    isPlaying, 
    togglePlaySong, 
    playNextSong, 
    playPrevSong,
    positionMillis, 
    durationMillis, 
    seekTo,
    isLooping,
    toggleLoop,
    isShuffle,
    toggleShuffle,
    isPlayerExpanded, 
    setIsPlayerExpanded,
    sleepTimerRemaining
  } = useContext(PlaylistContext);

  const scrubberRef = useRef(null);

  if (!currentlyPlayingSong) return null;

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';

  // Format milliseconds into MM:SS
  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressRatio = durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  // Handle tap on scrubber bar to seek
  const handleScrubberPress = (event) => {
    try {
      const { locationX } = event.nativeEvent;
      // Get approx bar width or use layout width
      const barWidth = 320; // responsive approx or measured
      const clickRatio = Math.max(0, Math.min(locationX / barWidth, 1));
      const targetMillis = clickRatio * durationMillis;
      seekTo(targetMillis);
    } catch (e) {
      console.warn("Scrub error:", e);
    }
  };

  return (
    <Modal
      visible={isPlayerExpanded}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsPlayerExpanded(false)}
    >
      <View style={[styles.canvas, { backgroundColor: dominantColor }]}>
        <SafeAreaView style={styles.safeContainer}>
          {/* Header Action Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={() => setIsPlayerExpanded(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-down" size={28} color={textColor} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerSubtitle, { color: accentColor }]}>NOW PLAYING</Text>
              <Text style={[styles.headerAppTitle, { color: subtextColor }]}>Anti-Music</Text>
            </View>

            {sleepTimerRemaining ? (
              <View style={[styles.timerBadge, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="timer" size={14} color={accentColor} />
                <Text style={[styles.timerBadgeText, { color: accentColor }]}>
                  {Math.floor(sleepTimerRemaining / 60)}m
                </Text>
              </View>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          {/* Big Glowing Album Artwork */}
          <View style={styles.heroArtworkSection}>
            <View style={[
              styles.artworkCard,
              { 
                backgroundColor: surfaceColor, 
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                shadowColor: accentColor,
              }
            ]}>
              {currentlyPlayingSong.coverImage ? (
                <Image 
                  source={{ uri: currentlyPlayingSong.coverImage }} 
                  style={{ width: '100%', height: '100%', borderRadius: 36 }} 
                  resizeMode="cover" 
                />
              ) : (
                <View style={[styles.discCircle, { backgroundColor: accentColor + '25' }]}>
                  <Ionicons name="musical-notes" size={72} color={accentColor} />
                </View>
              )}
            </View>
          </View>

          {/* Track Titles */}
          <View style={styles.trackDetailsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.songTitle, { color: textColor }]} numberOfLines={1}>
                {currentlyPlayingSong.title}
              </Text>
              <Text style={[styles.songArtist, { color: subtextColor }]} numberOfLines={1}>
                {currentlyPlayingSong.artist || 'Local Offline Audio'}
              </Text>
            </View>

            <View style={[styles.offlineTag, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.offlineTagText, { color: accentColor }]}>Offline</Text>
            </View>
          </View>

          {/* Interactive Scrubber Bar */}
          <View style={styles.scrubberSection}>
            <TouchableOpacity 
              ref={scrubberRef}
              style={styles.scrubberTrackWrapper} 
              onPress={handleScrubberPress}
              activeOpacity={0.9}
            >
              <View style={[styles.scrubberBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                <View 
                  style={[
                    styles.scrubberFill, 
                    { 
                      width: `${progressRatio * 100}%`,
                      backgroundColor: accentColor 
                    }
                  ]} 
                />
                {/* Thumb Indicator */}
                <View 
                  style={[
                    styles.scrubberThumb, 
                    { 
                      left: `${progressRatio * 100}%`,
                      backgroundColor: textColor 
                    }
                  ]} 
                />
              </View>
            </TouchableOpacity>

            {/* Time Labels */}
            <View style={styles.timeLabelsRow}>
              <Text style={[styles.timeText, { color: subtextColor }]}>
                {formatTime(positionMillis)}
              </Text>
              <Text style={[styles.timeText, { color: subtextColor }]}>
                {formatTime(durationMillis)}
              </Text>
            </View>
          </View>

          {/* Main Transport Controls */}
          <View style={styles.transportSection}>
            {/* Shuffle Mode */}
            <TouchableOpacity 
              style={[
                styles.modeBtn, 
                isShuffle && { backgroundColor: accentColor + '20', borderRadius: 16 }
              ]}
              onPress={toggleShuffle}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="shuffle" 
                size={22} 
                color={isShuffle ? accentColor : subtextColor} 
              />
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity 
              style={styles.skipBtn}
              onPress={playPrevSong}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-back" size={28} color={textColor} />
            </TouchableOpacity>

            {/* Main Center Play/Pause Pill */}
            <TouchableOpacity 
              style={[styles.bigPlayBtn, { backgroundColor: accentColor }]}
              onPress={() => togglePlaySong()}
              activeOpacity={0.85}
            >
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={34} 
                color="#FFFFFF" 
                style={{ marginLeft: isPlaying ? 0 : 4 }}
              />
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity 
              style={styles.skipBtn}
              onPress={playNextSong}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-forward" size={28} color={textColor} />
            </TouchableOpacity>

            {/* Loop / Repeat Mode */}
            <TouchableOpacity 
              style={[
                styles.modeBtn, 
                isLooping && { backgroundColor: accentColor + '20', borderRadius: 16 }
              ]}
              onPress={toggleLoop}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="repeat" 
                size={22} 
                color={isLooping ? accentColor : subtextColor} 
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
    paddingHorizontal: 26,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'web' ? 24 : 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerAppTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  timerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroArtworkSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  artworkCard: {
    width: 270,
    height: 270,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  discCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  songArtist: {
    fontSize: 14,
    marginTop: 4,
  },
  offlineTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  offlineTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrubberSection: {
    marginBottom: 20,
  },
  scrubberTrackWrapper: {
    paddingVertical: 10,
  },
  scrubberBackground: {
    height: 5,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  scrubberFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -5,
    width: 15,
    height: 15,
    borderRadius: 8,
    marginLeft: -7,
  },
  timeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  modeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
});

