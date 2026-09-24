import React, { useContext, useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  SafeAreaView, 
  Platform,
  Image,
  Animated,
  ScrollView,
  ActivityIndicator
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
    sleepTimerRemaining,
    toggleLikeSong,
    isSongLiked,
  } = useContext(PlaylistContext);

  const scrubberRef = useRef(null);
  const [scrubberWidth, setScrubberWidth] = useState(0);

  // -------------------------------------------------------------
  // Live Audio Waveform Visualizer (5 animated rhythmic bars)
  // -------------------------------------------------------------
  const barHeights = useRef([
    new Animated.Value(6),
    new Animated.Value(12),
    new Animated.Value(16),
    new Animated.Value(10),
    new Animated.Value(8),
  ]).current;

  useEffect(() => {
    let animLoop = null;
    if (isPlaying) {
      const createBarAnim = (val, toVal1, toVal2, duration) => {
        return Animated.sequence([
          Animated.timing(val, { toValue: toVal1, duration, useNativeDriver: false }),
          Animated.timing(val, { toValue: toVal2, duration, useNativeDriver: false }),
        ]);
      };

      animLoop = Animated.loop(
        Animated.parallel([
          createBarAnim(barHeights[0], 14, 5, 420),
          createBarAnim(barHeights[1], 6, 16, 360),
          createBarAnim(barHeights[2], 16, 7, 480),
          createBarAnim(barHeights[3], 5, 14, 390),
          createBarAnim(barHeights[4], 14, 6, 440),
        ])
      );
      animLoop.start();
    } else {
      Animated.parallel(
        barHeights.map(val => Animated.timing(val, { toValue: 4, duration: 200, useNativeDriver: false }))
      ).start();
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isPlaying]);

  // -------------------------------------------------------------
  // Time-Synchronized Lyrics System (LRCLIB backend integration)
  // -------------------------------------------------------------
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [lyricsData, setLyricsData] = useState(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsScrollRef = useRef(null);

  const getBackendUrl = () => {
    return Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.19.227.173:8000';
  };

  const fetchLyrics = async (song) => {
    if (!song || !song.title) return;
    setIsLyricsLoading(true);
    setLyricsData(null);
    try {
      const res = await fetch(`${getBackendUrl()}/lyrics?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist || '')}`);
      if (res.ok) {
        const data = await res.json();
        setLyricsData(data);
      } else {
        setLyricsData({ found: false });
      }
    } catch (e) {
      console.warn("Failed to fetch lyrics:", e);
      setLyricsData({ found: false });
    } finally {
      setIsLyricsLoading(false);
    }
  };

  useEffect(() => {
    if (isLyricsOpen && currentlyPlayingSong) {
      fetchLyrics(currentlyPlayingSong);
    }
  }, [currentlyPlayingSong?.id, isLyricsOpen]);

  const handleToggleLyrics = () => {
    const nextVal = !isLyricsOpen;
    setIsLyricsOpen(nextVal);
    if (nextVal && !lyricsData && !isLyricsLoading) {
      fetchLyrics(currentlyPlayingSong);
    }
  };

  const lyricsLines = lyricsData?.lines || [];
  const currentLineIndex = lyricsLines.length > 0
    ? lyricsLines.findIndex((line, i) => {
        const nextLine = lyricsLines[i + 1];
        return positionMillis >= line.timeMs && (!nextLine || positionMillis < nextLine.timeMs);
      })
    : -1;

  // Auto-scroll lyrics smoothly to active line
  useEffect(() => {
    if (isLyricsOpen && lyricsScrollRef.current && currentLineIndex >= 0) {
      try {
        lyricsScrollRef.current.scrollTo({
          y: Math.max(0, currentLineIndex * 46 - 80),
          animated: true,
        });
      } catch (e) {}
    }
  }, [currentLineIndex, isLyricsOpen]);

  if (!currentlyPlayingSong) return null;

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';

  // Format milliseconds into MM:SS or H:MM:SS
  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressRatio = durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  // Handle tap on scrubber bar to seek with real measured pixel width
  const handleScrubberPress = (event) => {
    try {
      const { locationX } = event.nativeEvent;
      const barWidth = scrubberWidth > 0 ? scrubberWidth : 320;
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
        <View style={styles.desktopWrapper}>
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

            {/* Header Right Actions (Lyrics Toggle + Timer) */}
            <View style={styles.headerRightGroup}>
              <TouchableOpacity
                style={[
                  styles.lyricsToggleBtn,
                  isLyricsOpen && { backgroundColor: accentColor + '25', borderColor: accentColor }
                ]}
                onPress={handleToggleLyrics}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isLyricsOpen ? "musical-notes" : "chatbubble-ellipses"} 
                  size={18} 
                  color={isLyricsOpen ? accentColor : subtextColor} 
                />
              </TouchableOpacity>

              {sleepTimerRemaining ? (
                <View style={[styles.timerBadge, { backgroundColor: accentColor + '20' }]}>
                  <Ionicons name="timer" size={14} color={accentColor} />
                  <Text style={[styles.timerBadgeText, { color: accentColor }]}>
                    {Math.floor(sleepTimerRemaining / 60)}m
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Big Glowing Album Artwork OR Synchronized Lyrics View */}
          {!isLyricsOpen ? (
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
          ) : (
            <View style={[styles.lyricsContainer, { backgroundColor: surfaceColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
              {isLyricsLoading ? (
                <View style={styles.lyricsLoadingCenter}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={[styles.lyricsStatusText, { color: subtextColor }]}>
                    Finding synchronized lyrics...
                  </Text>
                </View>
              ) : lyricsData?.isSynced && lyricsLines.length > 0 ? (
                <ScrollView 
                  ref={lyricsScrollRef}
                  style={styles.lyricsScroll}
                  contentContainerStyle={styles.lyricsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {lyricsLines.map((line, idx) => {
                    const isActive = idx === currentLineIndex;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.lyricLineBtn, isActive && styles.activeLyricLineBtn]}
                        onPress={() => seekTo(line.timeMs)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.lyricLineText,
                          {
                            color: isActive ? (isDark ? '#FFFFFF' : accentColor) : subtextColor,
                            fontSize: isActive ? 19 : 15,
                            fontWeight: isActive ? '800' : '500',
                            opacity: isActive ? 1 : 0.45,
                          }
                        ]}>
                          {line.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : lyricsData?.plainLyrics ? (
                <ScrollView 
                  style={styles.lyricsScroll}
                  contentContainerStyle={styles.lyricsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.plainLyricsText, { color: textColor }]}>
                    {lyricsData.plainLyrics}
                  </Text>
                </ScrollView>
              ) : (
                <View style={styles.lyricsLoadingCenter}>
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color={subtextColor} />
                  <Text style={[styles.lyricsStatusText, { color: textColor, fontWeight: '700', marginTop: 8 }]}>
                    No Lyrics Found
                  </Text>
                  <Text style={[styles.lyricsSubstatusText, { color: subtextColor }]}>
                    No synchronized lyrics available for this track.
                  </Text>
                  <TouchableOpacity
                    style={[styles.backToArtBtn, { backgroundColor: accentColor + '20' }]}
                    onPress={() => setIsLyricsOpen(false)}
                  >
                    <Text style={[styles.backToArtText, { color: accentColor }]}>Show Album Art</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Track Titles & Like Action */}
          <View style={styles.trackDetailsRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.songTitle, { color: textColor }]} numberOfLines={1}>
                {currentlyPlayingSong.title}
              </Text>
              <Text style={[styles.songArtist, { color: subtextColor }]} numberOfLines={1}>
                {currentlyPlayingSong.artist || 'Local Offline Audio'}
              </Text>
            </View>

            {/* Favorite Heart Button */}
            <TouchableOpacity
              style={styles.fullHeartBtn}
              onPress={() => toggleLikeSong(currentlyPlayingSong.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isSongLiked(currentlyPlayingSong.id) ? "heart" : "heart-outline"} 
                size={26} 
                color={isSongLiked(currentlyPlayingSong.id) ? "#FF2D55" : subtextColor} 
              />
            </TouchableOpacity>

            <View style={[styles.offlineTag, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.offlineTagText, { color: accentColor }]}>Offline</Text>
            </View>
          </View>

          {/* Live Waveform Indicator Row */}
          <View style={styles.waveformRow}>
            <View style={styles.waveformBars}>
              {barHeights.map((anim, idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.waveformBar,
                    {
                      backgroundColor: isPlaying ? accentColor : (isDark ? '#52525B' : '#D1D5DB'),
                      height: anim,
                    }
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.waveformText, { color: isPlaying ? accentColor : subtextColor }]}>
              {isPlaying ? "LIVE AUDIO" : "PAUSED"}
            </Text>
          </View>

          {/* Interactive Scrubber Bar */}
          <View style={styles.scrubberSection}>
            <TouchableOpacity 
              ref={scrubberRef}
              style={styles.scrubberTrackWrapper} 
              onLayout={(e) => setScrubberWidth(e.nativeEvent.layout.width)}
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
                size={32} 
                color="#FFFFFF" 
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    alignSelf: 'center',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 32 : 28,
    paddingTop: Platform.OS === 'web' ? 20 : 12,
    paddingBottom: Platform.OS === 'web' ? 32 : 20,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 10 : 6,
    marginBottom: 8,
    paddingHorizontal: 4,
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
    marginVertical: 14,
  },
  artworkCard: {
    width: 270,
    height: 270,
    maxWidth: '85%',
    aspectRatio: 1,
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
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  songArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  offlineTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  offlineTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 22,
    minHeight: 22,
    maxHeight: 22,
    overflow: 'hidden',
    marginBottom: 6,
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 18,
    minHeight: 18,
    maxHeight: 18,
    overflow: 'hidden',
    gap: 4,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
  },
  waveformText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrubberSection: {
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  scrubberTrackWrapper: {
    paddingVertical: 10,
    width: '100%',
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
    paddingHorizontal: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
    minHeight: 72,
    maxHeight: 72,
    paddingHorizontal: 18,
    marginBottom: 16,
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
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lyricsToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lyricsContainer: {
    width: 270,
    height: 270,
    maxWidth: '85%',
    aspectRatio: 1,
    borderRadius: 36,
    borderWidth: 1,
    alignSelf: 'center',
    marginVertical: 20,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  lyricsLoadingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lyricsStatusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  lyricsSubstatusText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  backToArtBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  backToArtText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lyricsScroll: {
    flex: 1,
    width: '100%',
  },
  lyricsScrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 6,
  },
  lyricLineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 4,
  },
  activeLyricLineBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  lyricLineText: {
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  plainLyricsText: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  fullHeartBtn: {
    padding: 8,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

