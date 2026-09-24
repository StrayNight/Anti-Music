import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const TIMER_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
];

export default function LibraryScreen() {
  const { 
    dominantColor, 
    surfaceColor, 
    accentColor, 
    backgroundImage, 
    isDark 
  } = useContext(ThemeContext);

  const playlistContext = useContext(PlaylistContext) || {};
  const {
    allSongs = [],
    playlists = [],
    currentlyPlayingSong = null,
    isPlaying = false,
    sleepTimerRemaining = null,
    sleepTimerMinutes = null,
    createPlaylist = async () => {},
    deletePlaylist = async () => {},
    updatePlaylistCover = async () => {},
    addSongToPlaylist = async () => {},
    removeSongFromPlaylist = async () => {},
    reorderSongInPlaylist = async () => {},
    shufflePlaylist = async () => {},
    togglePlaySong = async () => {},
    startSleepTimer = () => {},
    cancelSleepTimer = () => {},
    importSongFromDevice = async () => {},
  } = playlistContext;

  // View state: 'playlists' | 'songs'
  const [activeSegment, setActiveSegment] = useState('playlists');
  // Selected playlist for detailed view (null = top list)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCover, setNewCover] = useState(null);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';
  const cardBg = backgroundImage 
    ? (isDark ? 'rgba(23, 27, 34, 0.88)' : 'rgba(255, 255, 255, 0.88)') 
    : surfaceColor;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  // Format Sleep Timer countdown (e.g. 14:59)
  const formatTimerTime = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const pickNewPlaylistImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewCover(result.assets[0].uri);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim()) {
      alert("Please enter a playlist name");
      return;
    }
    const created = await createPlaylist(newTitle, newCover, accentColor);
    setNewTitle('');
    setNewCover(null);
    setShowCreateModal(false);
    setSelectedPlaylistId(created.id);
  };

  const handleUpdateCurrentCover = async () => {
    if (!selectedPlaylistId) return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await updatePlaylistCover(selectedPlaylistId, result.assets[0].uri);
    }
  };

  const handleImportLocalSong = async () => {
    const imported = await importSongFromDevice();
    if (imported) {
      alert(`✓ Successfully imported: "${imported.title}" into your Library!`);
    }
  };

  // -------------------------------------------------------------
  // DETAIL VIEW: INSIDE A PLAYLIST FOLDER
  // -------------------------------------------------------------
  if (selectedPlaylist) {
    const songs = selectedPlaylist.songs || [];

    return (
      <View style={styles.container}>
        {/* Top Back & Action Header */}
        <View style={styles.detailNavRow}>
          <TouchableOpacity 
            style={[styles.backPill, { backgroundColor: cardBg, borderColor }]}
            onPress={() => setSelectedPlaylistId(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color={accentColor} />
            <Text style={[styles.backText, { color: accentColor }]}>Playlists</Text>
          </TouchableOpacity>

          {/* Sleep Timer Indicator Pill */}
          <TouchableOpacity
            style={[
              styles.timerPillBtn,
              { backgroundColor: sleepTimerRemaining ? accentColor + '20' : cardBg, borderColor }
            ]}
            onPress={() => setShowTimerModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={sleepTimerRemaining ? "timer" : "timer-outline"} 
              size={16} 
              color={sleepTimerRemaining ? accentColor : subtextColor} 
            />
            <Text style={[styles.timerPillText, { color: sleepTimerRemaining ? accentColor : subtextColor }]}>
              {sleepTimerRemaining ? formatTimerTime(sleepTimerRemaining) : 'Timer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deletePill, { borderColor, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FFF5F5' }]}
            onPress={() => {
              if (confirm ? confirm(`Delete "${selectedPlaylist.title}"?`) : true) {
                deletePlaylist(selectedPlaylist.id);
                setSelectedPlaylistId(null);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Playlist Hero Banner */}
        <View style={[styles.playlistHeroCard, { backgroundColor: cardBg, borderColor }]}>
          <TouchableOpacity 
            onPress={handleUpdateCurrentCover}
            style={styles.heroCoverWrapper}
            activeOpacity={0.85}
          >
            {selectedPlaylist.coverImage ? (
              <Image source={{ uri: selectedPlaylist.coverImage }} style={styles.heroCoverImage} />
            ) : (
              <View style={[styles.heroPlaceholder, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="folder" size={44} color={accentColor} />
              </View>
            )}
            <View style={styles.editCoverBadge}>
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.heroMeta}>
            <Text style={[styles.playlistHeroTitle, { color: textColor }]} numberOfLines={2}>
              {selectedPlaylist.title}
            </Text>
            <Text style={[styles.playlistHeroCount, { color: subtextColor }]}>
              {songs.length} tracks • Custom Order
            </Text>
            <Text style={[styles.editCoverHint, { color: accentColor }]}>
              Tap cover to change photo
            </Text>
          </View>
        </View>

        {/* Quick Toolbar: Shuffle Order & Add Songs */}
        <View style={styles.playlistToolbar}>
          <TouchableOpacity 
            style={[styles.toolPillBtn, { backgroundColor: accentColor }]}
            onPress={() => {
              shufflePlaylist(selectedPlaylist.id);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="shuffle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.toolPillTextWhite}>Shuffle Order</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.toolPillBtnSecondary, { backgroundColor: cardBg, borderColor }]}
            onPress={() => setShowAddSongsModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color={accentColor} style={{ marginRight: 6 }} />
            <Text style={[styles.toolPillTextSecondary, { color: accentColor }]}>Add Songs</Text>
          </TouchableOpacity>
        </View>

        {/* Track List with Move Up/Down Order Controls */}
        <FlatList
          data={songs}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: currentlyPlayingSong ? 180 : 80 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isPlayingThis = currentlyPlayingSong?.id === item.id && isPlaying;
            const isFirst = index === 0;
            const isLast = index === songs.length - 1;

            return (
              <View 
                style={[
                  styles.reorderSongRow,
                  { backgroundColor: cardBg, borderColor },
                  isPlayingThis && { borderColor: accentColor, borderWidth: 1.5 }
                ]}
              >
                {/* Order Index Badge */}
                <View style={styles.orderBadge}>
                  <Text style={[styles.orderNumber, { color: subtextColor }]}>{index + 1}</Text>
                </View>

                {/* Song Info */}
                <TouchableOpacity 
                  style={styles.songMainTouch}
                  onPress={() => togglePlaySong(item, songs)}
                  activeOpacity={0.7}
                >
                  {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={[styles.artworkSquare, { borderRadius: 12 }]} />
                  ) : (
                    <View style={[
                      styles.artworkSquare,
                      { backgroundColor: isPlayingThis ? accentColor : accentColor + '18' }
                    ]}>
                      <Ionicons 
                        name={isPlayingThis ? "volume-high" : "musical-note"} 
                        size={20} 
                        color={isPlayingThis ? "#FFFFFF" : accentColor} 
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.songTitle, { color: isPlayingThis ? accentColor : textColor }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.songArtist, { color: subtextColor }]} numberOfLines={1}>
                      {item.artist} • {item.duration}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Move Up / Down Buttons (Choose Order) */}
                <View style={styles.orderControlsRow}>
                  <TouchableOpacity
                    style={[styles.orderArrowBtn, isFirst && { opacity: 0.25 }]}
                    onPress={() => reorderSongInPlaylist(selectedPlaylist.id, index, index - 1)}
                    disabled={isFirst}
                  >
                    <Ionicons name="chevron-up" size={17} color={textColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orderArrowBtn, isLast && { opacity: 0.25 }]}
                    onPress={() => reorderSongInPlaylist(selectedPlaylist.id, index, index + 1)}
                    disabled={isLast}
                  >
                    <Ionicons name="chevron-down" size={17} color={textColor} />
                  </TouchableOpacity>
                </View>

                {/* Remove from Playlist Button */}
                <TouchableOpacity
                  style={styles.removeSongBtn}
                  onPress={() => removeSongFromPlaylist(selectedPlaylist.id, index)}
                >
                  <Ionicons name="close" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="musical-notes-outline" size={40} color={accentColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>Folder Is Empty</Text>
              <Text style={[styles.emptyDesc, { color: subtextColor }]}>
                Tap "Add Songs" above to add offline tracks to this playlist.
              </Text>
            </View>
          }
        />

        {/* Modal: Add Songs from Library */}
        <Modal visible={showAddSongsModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: surfaceColor }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: textColor }]}>Add Songs to Playlist</Text>
                <TouchableOpacity onPress={() => setShowAddSongsModal(false)}>
                  <Ionicons name="close-circle" size={24} color={subtextColor} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={allSongs}
                keyExtractor={item => item.id}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => {
                  const alreadyIn = songs.some(s => s.id === item.id);
                  return (
                    <View style={styles.addSongModalRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.songTitle, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.songArtist, { color: subtextColor }]}>{item.artist}</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.addSongActionBtn,
                          { backgroundColor: alreadyIn ? 'rgba(0,0,0,0.06)' : accentColor }
                        ]}
                        onPress={() => {
                          addSongToPlaylist(selectedPlaylist.id, item);
                        }}
                      >
                        <Ionicons 
                          name={alreadyIn ? "checkmark" : "add"} 
                          size={18} 
                          color={alreadyIn ? subtextColor : "#FFFFFF"} 
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Modal: Sleep Timer */}
        <Modal visible={showTimerModal} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: surfaceColor }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="timer" size={22} color={accentColor} />
                  <Text style={[styles.modalTitle, { color: textColor }]}>Sleep Timer</Text>
                </View>
                <TouchableOpacity onPress={() => setShowTimerModal(false)}>
                  <Ionicons name="close-circle" size={24} color={subtextColor} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, { color: subtextColor }]}>
                Music will automatically stop when timer ends:
              </Text>

              {sleepTimerRemaining ? (
                <View style={[styles.activeTimerBox, { backgroundColor: accentColor + '15', borderColor: accentColor }]}>
                  <Text style={[styles.activeTimerLabel, { color: accentColor }]}>
                    Time Remaining
                  </Text>
                  <Text style={[styles.activeTimerCountdown, { color: accentColor }]}>
                    {formatTimerTime(sleepTimerRemaining)}
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelTimerBtn}
                    onPress={() => {
                      cancelSleepTimer();
                    }}
                  >
                    <Text style={styles.cancelTimerBtnText}>Turn Off Sleep Timer</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.timerPresetsGrid}>
                {TIMER_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.timerPresetBtn,
                      { backgroundColor: cardBg, borderColor },
                      sleepTimerMinutes === preset.minutes && { borderColor: accentColor, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      startSleepTimer(preset.minutes);
                      setShowTimerModal(false);
                    }}
                  >
                    <Ionicons name="time-outline" size={18} color={accentColor} />
                    <Text style={[styles.timerPresetText, { color: textColor }]}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // -------------------------------------------------------------
  // MAIN VIEW: SEGMENT SWITCHER (ALL SONGS VS PLAYLIST FOLDERS)
  // -------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Apple-style Segmented Filter & Sleep Timer Action */}
      <View style={styles.topControlRow}>
        <View style={[styles.segmentContainer, { backgroundColor: cardBg, borderColor }]}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeSegment === 'playlists' && { backgroundColor: accentColor }
            ]}
            onPress={() => setActiveSegment('playlists')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="folder" 
              size={15} 
              color={activeSegment === 'playlists' ? '#FFFFFF' : subtextColor} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[
              styles.segmentText,
              { color: activeSegment === 'playlists' ? '#FFFFFF' : subtextColor, fontWeight: '700' }
            ]}>
              Playlists ({playlists.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeSegment === 'songs' && { backgroundColor: accentColor }
            ]}
            onPress={() => setActiveSegment('songs')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="musical-notes" 
              size={15} 
              color={activeSegment === 'songs' ? '#FFFFFF' : subtextColor} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[
              styles.segmentText,
              { color: activeSegment === 'songs' ? '#FFFFFF' : subtextColor, fontWeight: '700' }
            ]}>
              All Songs ({allSongs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sleep Timer Header Pill */}
        <TouchableOpacity
          style={[
            styles.timerHeaderBtn,
            { backgroundColor: sleepTimerRemaining ? accentColor + '20' : cardBg, borderColor }
          ]}
          onPress={() => setShowTimerModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={sleepTimerRemaining ? "timer" : "timer-outline"} 
            size={18} 
            color={sleepTimerRemaining ? accentColor : subtextColor} 
          />
          {sleepTimerRemaining ? (
            <Text style={[styles.timerHeaderText, { color: accentColor }]}>
              {formatTimerTime(sleepTimerRemaining)}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* -------------------- PLAYLISTS TAB -------------------- */}
      {activeSegment === 'playlists' && (
        <View style={{ flex: 1 }}>
          <View style={styles.actionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: textColor }]}>Playlist Folders</Text>
            <TouchableOpacity 
              style={[styles.createPillBtn, { backgroundColor: accentColor }]}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.createPillText}>New Playlist</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={playlists}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: currentlyPlayingSong ? 180 : 80 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  style={[styles.folderCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => setSelectedPlaylistId(item.id)}
                  activeOpacity={0.75}
                >
                  {/* Folder Cover Image or Icon */}
                  {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={styles.folderCoverImg} />
                  ) : (
                    <View style={[styles.folderIconBox, { backgroundColor: accentColor + '20' }]}>
                      <Ionicons name="folder" size={32} color={accentColor} />
                    </View>
                  )}

                  <View style={styles.folderMeta}>
                    <Text style={[styles.folderTitle, { color: textColor }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.folderCount, { color: subtextColor }]}>
                      {item.songs ? item.songs.length : 0} tracks • Tap to open
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={subtextColor} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
                <Ionicons name="folder-open-outline" size={44} color={accentColor} />
                <Text style={[styles.emptyTitle, { color: textColor }]}>No Playlists Created</Text>
                <Text style={[styles.emptyDesc, { color: subtextColor }]}>
                  Tap "+ New Playlist" to create your first music folder and add cover artwork.
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* -------------------- ALL SONGS TAB -------------------- */}
      {activeSegment === 'songs' && (
        <View style={{ flex: 1 }}>
          <View style={styles.actionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: textColor }]}>Offline Tracks ({allSongs.length})</Text>
            
            {/* Import from Local Memory CTA */}
            <TouchableOpacity 
              style={[styles.importPillBtn, { backgroundColor: accentColor }]}
              onPress={handleImportLocalSong}
              activeOpacity={0.85}
            >
              <Ionicons name="folder-open" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.importPillText}>Import Audio File</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={allSongs}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: currentlyPlayingSong ? 180 : 80 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isPlayingThis = currentlyPlayingSong?.id === item.id && isPlaying;
              return (
                <TouchableOpacity
                  style={[
                    styles.appleSongRow,
                    { backgroundColor: cardBg, borderColor },
                    isPlayingThis && { borderColor: accentColor, borderWidth: 1.5 }
                  ]}
                  onPress={() => togglePlaySong(item, allSongs)}
                  activeOpacity={0.7}
                >
                  {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={[styles.artworkSquare, { borderRadius: 12 }]} />
                  ) : (
                    <View style={[
                      styles.artworkSquare,
                      { backgroundColor: isPlayingThis ? accentColor : accentColor + '18' }
                    ]}>
                      <Ionicons 
                        name={isPlayingThis ? "volume-high" : (item.isLocalFile ? "document-text" : "musical-note")} 
                        size={20} 
                        color={isPlayingThis ? "#FFFFFF" : accentColor} 
                      />
                    </View>
                  )}

                  <View style={styles.metaContainer}>
                    <Text style={[styles.songTitle, { color: isPlayingThis ? accentColor : textColor }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.songArtist, { color: subtextColor }]}>
                      {item.artist} {item.duration ? `• ${item.duration}` : ''}
                    </Text>
                  </View>

                  <View style={[
                    styles.actionPill, 
                    { backgroundColor: isPlayingThis ? accentColor + '20' : 'rgba(0,0,0,0.04)' }
                  ]}>
                    <Ionicons 
                      name={isPlayingThis ? "pause" : "play"} 
                      size={16} 
                      color={isPlayingThis ? accentColor : subtextColor} 
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* -------------------- CREATE PLAYLIST MODAL -------------------- */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: textColor }]}>New Playlist Folder</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close-circle" size={24} color={subtextColor} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.modalImagePicker, { backgroundColor: accentColor + '15', borderColor: accentColor }]}
              onPress={pickNewPlaylistImage}
              activeOpacity={0.8}
            >
              {newCover ? (
                <Image source={{ uri: newCover }} style={styles.modalPickedImage} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="image-outline" size={32} color={accentColor} />
                  <Text style={[styles.modalImageText, { color: accentColor }]}>Choose Cover Picture</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={[styles.modalInput, { color: textColor, borderColor }]}
              placeholder="Playlist Name (e.g. Chill Beats)"
              placeholderTextColor="#999"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TouchableOpacity
              style={[styles.modalCreateBtn, { backgroundColor: accentColor }]}
              onPress={handleCreatePlaylist}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCreateBtnText}>Create Playlist Folder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* -------------------- SLEEP TIMER MODAL -------------------- */}
      <Modal visible={showTimerModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="timer" size={22} color={accentColor} />
                <Text style={[styles.modalTitle, { color: textColor }]}>Sleep Timer</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimerModal(false)}>
                <Ionicons name="close-circle" size={24} color={subtextColor} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: subtextColor }]}>
              Music will automatically stop when timer ends:
            </Text>

            {sleepTimerRemaining ? (
              <View style={[styles.activeTimerBox, { backgroundColor: accentColor + '15', borderColor: accentColor }]}>
                <Text style={[styles.activeTimerLabel, { color: accentColor }]}>
                  Time Remaining
                </Text>
                <Text style={[styles.activeTimerCountdown, { color: accentColor }]}>
                  {formatTimerTime(sleepTimerRemaining)}
                </Text>
                <TouchableOpacity
                  style={styles.cancelTimerBtn}
                  onPress={() => {
                    cancelSleepTimer();
                  }}
                >
                  <Text style={styles.cancelTimerBtnText}>Turn Off Sleep Timer</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.timerPresetsGrid}>
              {TIMER_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.timerPresetBtn,
                    { backgroundColor: cardBg, borderColor },
                    sleepTimerMinutes === preset.minutes && { borderColor: accentColor, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    startSleepTimer(preset.minutes);
                    setShowTimerModal(false);
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={accentColor} />
                  <Text style={[styles.timerPresetText, { color: textColor }]}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  segmentContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 16,
  },
  segmentText: {
    fontSize: 13,
  },
  timerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
  },
  timerHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  createPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  createPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  importPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  importPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  folderCoverImg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 14,
  },
  folderIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  folderMeta: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  folderCount: {
    fontSize: 12,
    marginTop: 3,
  },
  appleSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  artworkSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metaContainer: {
    flex: 1,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  songArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  actionPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // DETAIL VIEW
  detailNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  timerPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deletePill: {
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  playlistHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
  },
  heroCoverWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  heroCoverImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  heroPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCoverBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#000000AA',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    flex: 1,
  },
  playlistHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  playlistHeroCount: {
    fontSize: 13,
    marginTop: 3,
  },
  editCoverHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  playlistToolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  toolPillBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolPillTextWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  toolPillBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolPillTextSecondary: {
    fontWeight: '700',
    fontSize: 13,
  },
  reorderSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  orderBadge: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  songMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderControlsRow: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 6,
  },
  orderArrowBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  removeSongBtn: {
    padding: 6,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 20,
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
  // MODALS
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 26,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  modalImagePicker: {
    height: 120,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  modalPickedImage: {
    width: '100%',
    height: '100%',
  },
  modalImageText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 18,
  },
  modalCreateBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  addSongModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  addSongActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // TIMER MODAL STYLES
  activeTimerBox: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  activeTimerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeTimerCountdown: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 6,
  },
  cancelTimerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FF3B3015',
    marginTop: 6,
  },
  cancelTimerBtnText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
  },
  timerPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timerPresetBtn: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  timerPresetText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
