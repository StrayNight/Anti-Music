import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
  ScrollView,
  Image
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ThemeContext } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';
import { Ionicons } from '@expo/vector-icons';
import { getBackendUrl } from '../services/apiConfig';

const QUICK_TAGS = [
  'Lofi Beats',
  'Top Hits',
  'Synthwave',
  'Acoustic Guitar',
  'Rock Classics',
  'Piano Chill',
  'Electronic',
];

export default function SearchScreen() {
  const { 
    dominantColor, 
    surfaceColor, 
    accentColor, 
    backgroundImage, 
    isDark 
  } = useContext(ThemeContext);

  const { 
    addSongToLibrary, 
    allSongs = [], 
    currentlyPlayingSong,
    isPlaying = false,
    togglePlaySong,
    searchHistory = [],
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
    startDownloadTracking,
    updateDownloadTracking,
    completeDownloadTracking,
    cancelDownloadTracking,
  } = useContext(PlaylistContext);

  // Mode: 'search' | 'link'
  const [activeMode, setActiveMode] = useState('search');

  // Search by Keyword State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  // Direct Link State
  const [directUrl, setDirectUrl] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const [directStatus, setDirectStatus] = useState('');

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';
  const cardBg = backgroundImage 
    ? (isDark ? 'rgba(23, 27, 34, 0.88)' : 'rgba(255, 255, 255, 0.88)') 
    : surfaceColor;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      alert(`${title}: ${msg}`);
    }
  };

  // Check if a song is already present in user's library
  const isSongInLibrary = (item) => {
    if (downloadedIds.has(item.id)) return true;
    return allSongs.some(s => s.title.toLowerCase() === item.title.toLowerCase());
  };

  // Perform Keyword Search
  const handleSearch = async (queryText) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) {
      showAlert("Empty Search", "Please enter a song title, artist, or band to search.");
      return;
    }

    // Auto-detect: if user pasted a YouTube link into search bar, switch to direct link download
    if (q.includes('youtube.com') || q.includes('youtu.be')) {
      setActiveMode('link');
      setDirectUrl(q);
      return;
    }

    // Add query to search history
    if (addSearchQuery) {
      addSearchQuery(q);
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(`${getBackendUrl()}/search?q=${encodeURIComponent(q)}&limit=15`);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
      showAlert("Search Failed", "Could not reach downloader server. Ensure backend is running.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Download a single track from Search Results
  const handleDownloadTrack = async (track) => {
    setDownloadingId(track.id);
    if (startDownloadTracking) {
      startDownloadTracking(track.title);
    }

    const t1 = setTimeout(() => {
      if (updateDownloadTracking) updateDownloadTracking(45, 'Extracting audio stream...');
    }, 700);
    const t2 = setTimeout(() => {
      if (updateDownloadTracking) updateDownloadTracking(80, 'Converting 320kbps MP3...');
    }, 1800);

    try {
      const targetUrl = `${getBackendUrl()}/download?url=${encodeURIComponent(track.url)}`;
      const newSong = {
        id: 'yt_' + (track.id || Date.now()),
        title: track.title,
        artist: track.channel || 'YouTube Artist',
        duration: track.duration || 'Audio',
        coverImage: track.thumbnail || null,
        uri: Platform.OS === 'web' ? targetUrl : null,
      };

      if (Platform.OS === 'web') {
        await addSongToLibrary(newSong);
        window.open(targetUrl, '_blank');
        setDownloadedIds(prev => new Set(prev).add(track.id));
        clearTimeout(t1);
        clearTimeout(t2);
        if (completeDownloadTracking) completeDownloadTracking(track.title);
      } else {
        const fileUri = FileSystem.documentDirectory + `song_${Date.now()}.mp3`;
        const { uri } = await FileSystem.downloadAsync(targetUrl, fileUri);
        newSong.uri = uri;
        await addSongToLibrary(newSong);
        setDownloadedIds(prev => new Set(prev).add(track.id));
        clearTimeout(t1);
        clearTimeout(t2);
        if (completeDownloadTracking) completeDownloadTracking(track.title);
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      if (cancelDownloadTracking) cancelDownloadTracking(err.message);
      console.error("Download error:", err);
      showAlert("Download Failed", err.message || "Failed to download this track.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Direct Link Downloader
  const handleDirectDownload = async () => {
    const trimmed = directUrl.trim();
    if (!trimmed) {
      showAlert("Missing Link", "Please paste a YouTube URL to download.");
      return;
    }

    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      showAlert("Invalid Link", "Please paste a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }

    setDirectLoading(true);
    setDirectStatus('Connecting to Python server & converting audio...');
    if (startDownloadTracking) startDownloadTracking('YouTube Track');

    const dt1 = setTimeout(() => {
      if (updateDownloadTracking) updateDownloadTracking(45, 'Extracting YouTube stream...');
    }, 700);
    const dt2 = setTimeout(() => {
      if (updateDownloadTracking) updateDownloadTracking(80, 'Encoding offline MP3...');
    }, 1900);

    try {
      const targetUrl = `${getBackendUrl()}/download?url=${encodeURIComponent(trimmed)}`;
      
      let videoId = null;
      if (trimmed.includes('v=')) {
        videoId = trimmed.split('v=')[1]?.substring(0, 11);
      } else if (trimmed.includes('youtu.be/')) {
        videoId = trimmed.split('youtu.be/')[1]?.substring(0, 11);
      }

      const newSong = {
        id: 'song_' + Date.now(),
        title: videoId ? `YouTube Track (${videoId.substring(0, 8)})` : 'Downloaded Track',
        artist: 'Offline Audio',
        duration: 'Audio',
        coverImage: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
        uri: Platform.OS === 'web' ? targetUrl : null,
      };
      await addSongToLibrary(newSong);

      clearTimeout(dt1);
      clearTimeout(dt2);
      if (completeDownloadTracking) completeDownloadTracking(newSong.title);

      if (Platform.OS === 'web') {
        window.open(targetUrl, '_blank');
        setDirectLoading(false);
        setDirectStatus('✓ Download completed and added to your Library!');
        setDirectUrl('');
      } else {
        const fileUri = FileSystem.documentDirectory + `song_${Date.now()}.mp3`;
        const { uri } = await FileSystem.downloadAsync(targetUrl, fileUri);
        newSong.uri = uri;
        setDirectLoading(false);
        setDirectStatus('');
        showAlert("Download Complete", "Saved to offline library: " + uri);
        setDirectUrl('');
      }
    } catch (error) {
      clearTimeout(dt1);
      clearTimeout(dt2);
      if (cancelDownloadTracking) cancelDownloadTracking(error.message);
      setDirectLoading(false);
      setDirectStatus('');
      console.error(error);
      showAlert("Download Failed", error.message || "Could not reach local server.");
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: currentlyPlayingSong ? 180 : 60 }]} showsVerticalScrollIndicator={false}>
      
      {/* Apple-style Segmented Switcher: Search by Song vs Direct Link */}
      <View style={[styles.segmentContainer, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeMode === 'search' && { backgroundColor: accentColor }
          ]}
          onPress={() => setActiveMode('search')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="search" 
            size={16} 
            color={activeMode === 'search' ? '#FFFFFF' : subtextColor} 
            style={{ marginRight: 6 }}
          />
          <Text style={[
            styles.segmentBtnText, 
            { color: activeMode === 'search' ? '#FFFFFF' : subtextColor, fontWeight: activeMode === 'search' ? '700' : '500' }
          ]}>
            Search Songs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeMode === 'link' && { backgroundColor: accentColor }
          ]}
          onPress={() => setActiveMode('link')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="link" 
            size={16} 
            color={activeMode === 'link' ? '#FFFFFF' : subtextColor} 
            style={{ marginRight: 6 }}
          />
          <Text style={[
            styles.segmentBtnText, 
            { color: activeMode === 'link' ? '#FFFFFF' : subtextColor, fontWeight: activeMode === 'link' ? '700' : '500' }
          ]}>
            Direct Link
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* MODE 1: IN-APP YOUTUBE KEYWORD SEARCH                    */}
      {/* ======================================================== */}
      {activeMode === 'search' && (
        <View>
          {/* Search Box Card */}
          <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="musical-notes" size={22} color={accentColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: textColor }]}>Search Music</Text>
                <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
                  Find songs, artists, or albums directly
                </Text>
              </View>
            </View>

            {/* Apple Pill Search Input */}
            <View style={[styles.inputWrapper, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}>
              <Ionicons name="search" size={20} color={subtextColor} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.softInput, { color: textColor }]}
                placeholder="Search song title or artist..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleSearch()}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 10 }}>
                  <Ionicons name="close-circle" size={18} color={subtextColor} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Tactile Search Button */}
            <TouchableOpacity
              style={[styles.applePillButton, { backgroundColor: accentColor }]}
              onPress={() => handleSearch()}
              disabled={isSearching}
              activeOpacity={0.85}
            >
              {isSearching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.applePillButtonText}>Search YouTube</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Recent Searches History Chips */}
            {searchHistory && searchHistory.length > 0 && (
              <View style={styles.historySection}>
                <View style={styles.historyHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={14} color={accentColor} />
                    <Text style={[styles.historyHeading, { color: subtextColor }]}>Recent Searches</Text>
                  </View>
                  <TouchableOpacity onPress={clearSearchHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.historyClearText, { color: accentColor }]}>Clear</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
                  {searchHistory.map((q, idx) => (
                    <View 
                      key={`${q}_${idx}`} 
                      style={[styles.historyChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', borderColor }]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setSearchQuery(q);
                          handleSearch(q);
                        }}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Text style={[styles.historyChipText, { color: textColor }]}>{q}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => removeSearchQuery(q)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={{ marginLeft: 6 }}
                      >
                        <Ionicons name="close-circle" size={14} color={subtextColor} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Quick Inspiration Tags */}
            <Text style={[styles.quickTagsHeading, { color: subtextColor }]}>Quick Inspiration:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
              {QUICK_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor }]}
                  onPress={() => {
                    setSearchQuery(tag);
                    handleSearch(tag);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagPillText, { color: textColor }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search Results Area */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={[styles.loadingText, { color: subtextColor }]}>
                Searching YouTube catalog for best audio...
              </Text>
            </View>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search-outline" size={44} color={subtextColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No Songs Found</Text>
              <Text style={[styles.emptyDesc, { color: subtextColor }]}>
                Try searching with a different artist name or song title.
              </Text>
            </View>
          )}

          {!isSearching && searchResults.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.resultsHeaderRow}>
                <Text style={[styles.resultsHeaderTitle, { color: textColor }]}>
                  Results ({searchResults.length})
                </Text>
                <Text style={[styles.resultsHeaderSubtitle, { color: subtextColor }]}>
                  Tap to download offline
                </Text>
              </View>

              {searchResults.map(item => {
                const inLibrary = isSongInLibrary(item);
                const isDownloadingThis = downloadingId === item.id;

                return (
                  <View 
                    key={item.id} 
                    style={[styles.resultCard, { backgroundColor: cardBg, borderColor }]}
                  >
                    {/* Video Thumbnail with duration badge */}
                    <View style={styles.thumbWrapper}>
                      {item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.resultThumb} />
                      ) : (
                        <View style={[styles.resultThumbPlaceholder, { backgroundColor: accentColor + '20' }]}>
                          <Ionicons name="musical-notes" size={24} color={accentColor} />
                        </View>
                      )}
                      {item.duration ? (
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationBadgeText}>{item.duration}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Track Info */}
                    <View style={styles.resultMeta}>
                      <Text style={[styles.resultTitle, { color: textColor }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="person-circle-outline" size={13} color={subtextColor} style={{ marginRight: 4 }} />
                        <Text style={[styles.resultChannel, { color: subtextColor }]} numberOfLines={1}>
                          {item.channel}
                        </Text>
                      </View>

                      {/* Downloading Live Progress Indicator Inside Card */}
                      {isDownloadingThis && (
                        <View style={styles.inlineDownloadProgress}>
                          <View style={[styles.inlineProgressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                            <View style={[styles.inlineProgressFill, { backgroundColor: accentColor }]} />
                          </View>
                          <Text style={[styles.inlineProgressText, { color: accentColor }]}>
                            Downloading audio stream...
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Download Action Button */}
                    <TouchableOpacity
                      style={[
                        styles.downloadActionBtn,
                        { backgroundColor: inLibrary ? 'rgba(16, 185, 129, 0.15)' : accentColor },
                        isDownloadingThis && { opacity: 0.95, backgroundColor: accentColor, minWidth: 84 }
                      ]}
                      onPress={() => handleDownloadTrack(item)}
                      disabled={isDownloadingThis || inLibrary}
                      activeOpacity={0.8}
                    >
                      {isDownloadingThis ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <ActivityIndicator color="#FFFFFF" size="small" />
                          <Text style={styles.downloadBtnText}>Saving</Text>
                        </View>
                      ) : inLibrary ? (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
                          <Text style={[styles.downloadBtnText, { color: '#10B981' }]}>Saved</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="arrow-down" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.downloadBtnText}>Get</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Recently Downloaded Shelf */}
          {allSongs && allSongs.length > 0 && (
            <View style={[styles.recentDownloadsCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="cloud-done" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: textColor }]}>Recently Downloaded</Text>
                  <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
                    {allSongs.length} offline audio songs in your library
                  </Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentShelfScroll}>
                {allSongs.slice(0, 10).map((song) => {
                  const isPlayingThis = currentlyPlayingSong?.id === song.id && isPlaying;
                  return (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.shelfCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor }]}
                      onPress={() => togglePlaySong(song, allSongs)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.shelfArtWrapper}>
                        {song.coverImage ? (
                          <Image source={{ uri: song.coverImage }} style={styles.shelfArt} resizeMode="cover" />
                        ) : (
                          <View style={[styles.shelfArt, { backgroundColor: accentColor + '20', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="musical-notes" size={26} color={accentColor} />
                          </View>
                        )}

                        <View style={styles.shelfPlayOverlay}>
                          <View style={[styles.shelfPlayCircle, { backgroundColor: isPlayingThis ? '#10B981' : accentColor }]}>
                            <Ionicons name={isPlayingThis ? "pause" : "play"} size={14} color="#FFFFFF" style={{ marginLeft: isPlayingThis ? 0 : 2 }} />
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.shelfTitle, { color: isPlayingThis ? accentColor : textColor }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[styles.shelfArtist, { color: subtextColor }]} numberOfLines={1}>
                        {song.artist || 'Offline Audio'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* MODE 2: DIRECT YOUTUBE LINK DOWNLOADER                   */}
      {/* ======================================================== */}
      {activeMode === 'link' && (
        <View>
          <View style={[styles.appleCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="cloud-download" size={22} color={accentColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: textColor }]}>Direct URL Downloader</Text>
                <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
                  Paste any YouTube video or song link
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
                value={directUrl}
                onChangeText={setDirectUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {directUrl ? (
                <TouchableOpacity onPress={() => setDirectUrl('')} style={{ padding: 10 }}>
                  <Ionicons name="close-circle" size={18} color={subtextColor} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Soft Apple Pill CTA */}
            <TouchableOpacity
              style={[styles.applePillButton, { backgroundColor: accentColor }]}
              onPress={handleDirectDownload}
              disabled={directLoading}
              activeOpacity={0.85}
            >
              {directLoading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.applePillButtonText}>Downloading Audio...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.applePillButtonText}>Download Offline Audio</Text>
                </>
              )}
            </TouchableOpacity>

            {directLoading ? (
              <View style={[styles.directProgressCard, { backgroundColor: accentColor + '12', borderColor: accentColor + '30' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={[styles.directProgressTitle, { color: accentColor }]}>
                    Downloading & Converting...
                  </Text>
                </View>
                <View style={[styles.directProgressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={[styles.directProgressBarFill, { backgroundColor: accentColor }]} />
                </View>
                <Text style={[styles.directProgressSubtitle, { color: subtextColor }]}>
                  {directStatus || 'Extracting high-quality audio stream...'}
                </Text>
              </View>
            ) : directStatus ? (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>{directStatus}</Text>
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
                  High-fidelity offline extraction
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
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
  },
  segmentBtnText: {
    fontSize: 13,
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
  },
  applePillButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  applePillButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  quickTagsHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
  },
  tagsScroll: {
    flexDirection: 'row',
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultsHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  resultsHeaderSubtitle: {
    fontSize: 12,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  resultThumb: {
    width: 82,
    height: 58,
    borderRadius: 12,
  },
  resultThumbPlaceholder: {
    width: 82,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  resultMeta: {
    flex: 1,
    marginRight: 10,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  resultChannel: {
    fontSize: 12,
  },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 64,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    padding: 12,
    borderRadius: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
  },
  historySection: {
    marginTop: 16,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  historyClearText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyScroll: {
    flexDirection: 'row',
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  historyChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentDownloadsCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  recentShelfScroll: {
    flexDirection: 'row',
    marginTop: 10,
  },
  shelfCard: {
    width: 120,
    marginRight: 12,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  shelfArtWrapper: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  shelfArt: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  shelfPlayOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  shelfPlayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  shelfTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  shelfArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  inlineDownloadProgress: {
    marginTop: 6,
  },
  inlineProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  inlineProgressFill: {
    height: '100%',
    width: '70%',
    borderRadius: 2,
  },
  inlineProgressText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  directProgressCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  directProgressTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  directProgressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  directProgressBarFill: {
    height: '100%',
    width: '65%',
    borderRadius: 2,
  },
  directProgressSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
});
