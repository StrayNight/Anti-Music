import React, { useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';
import { Ionicons } from '@expo/vector-icons';

export default function MiniPlayer() {
  const { surfaceColor, accentColor, isDark } = useContext(ThemeContext);
  const { 
    currentlyPlayingSong, 
    isPlaying, 
    togglePlaySong, 
    playNextSong,
    positionMillis, 
    durationMillis,
    setIsPlayerExpanded 
  } = useContext(PlaylistContext);

  if (!currentlyPlayingSong) return null;

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';
  const progressRatio = durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  return (
    <View style={styles.outerWrapper}>
      <TouchableOpacity 
        style={[
          styles.miniContainer, 
          { 
            backgroundColor: surfaceColor,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            shadowColor: isDark ? '#000000' : '#8E8E93',
          }
        ]}
        onPress={() => setIsPlayerExpanded(true)}
        activeOpacity={0.88}
      >
        {/* Artwork Icon Square */}
        <View style={[styles.artSquare, { backgroundColor: accentColor + '20' }]}>
          <Ionicons 
            name={isPlaying ? "disc" : "musical-note"} 
            size={20} 
            color={accentColor} 
          />
        </View>

        {/* Track Title & Artist */}
        <View style={styles.trackInfo}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {currentlyPlayingSong.title}
          </Text>
          <Text style={[styles.artist, { color: subtextColor }]} numberOfLines={1}>
            {currentlyPlayingSong.artist || 'Unknown Artist'}
          </Text>
        </View>

        {/* Transport Action Buttons */}
        <View style={styles.controlsRow}>
          {/* Play/Pause */}
          <TouchableOpacity 
            style={[styles.playPill, { backgroundColor: accentColor }]}
            onPress={(e) => {
              e.stopPropagation?.();
              togglePlaySong();
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={18} 
              color="#FFFFFF" 
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </TouchableOpacity>

          {/* Skip Next */}
          <TouchableOpacity 
            style={styles.skipBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              playNextSong();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="play-forward" size={20} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Live Progress Indicator along bottom edge */}
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progressRatio * 100}%`,
                backgroundColor: accentColor 
              }
            ]} 
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  artSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    padding: 6,
    borderRadius: 12,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  progressBar: {
    height: '100%',
  },
});

