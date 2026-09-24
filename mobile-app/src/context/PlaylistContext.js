import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  playAudio, 
  pauseAudio, 
  resumeAudio, 
  stopAudio, 
  seekAudio, 
  setLoopingAudio 
} from '../services/AudioPlayer';
import { pickAudioFromDevice } from '../services/LocalFilePicker';

export const PlaylistContext = createContext({
  allSongs: [],
  playlists: [],
  currentlyPlayingSong: null,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 1,
  isLooping: false,
  isShuffle: false,
  isPlayerExpanded: false,
  sleepTimerRemaining: null,
  sleepTimerMinutes: null,
  likedSongIds: [],
  likedSongs: [],
  toggleLikeSong: async () => {},
  isSongLiked: () => false,
  searchHistory: [],
  addSearchQuery: async () => {},
  removeSearchQuery: async () => {},
  clearSearchHistory: async () => {},
  downloadProgress: null,
  startDownloadTracking: () => {},
  updateDownloadTracking: () => {},
  completeDownloadTracking: () => {},
  cancelDownloadTracking: () => {},
  addSongToLibrary: async () => {},
  createPlaylist: async () => {},
  deletePlaylist: async () => {},
  updatePlaylistCover: async () => {},
  addSongToPlaylist: async () => {},
  removeSongFromPlaylist: async () => {},
  reorderSongInPlaylist: async () => {},
  shufflePlaylist: async () => {},
  playSong: async () => {},
  togglePlaySong: async () => {},
  playNextSong: async () => {},
  playPrevSong: async () => {},
  seekTo: async () => {},
  toggleLoop: () => {},
  toggleShuffle: () => {},
  setIsPlayerExpanded: () => {},
  startSleepTimer: () => {},
  cancelSleepTimer: () => {},
  importSongFromDevice: async () => {},
});

const PLAYLISTS_STORAGE_KEY = '@app_playlists_v2';
const ALL_SONGS_STORAGE_KEY = '@app_all_songs_v2';
const LIKED_SONGS_STORAGE_KEY = '@app_liked_song_ids_v1';
const SEARCH_HISTORY_STORAGE_KEY = '@app_search_history_v1';

const INITIAL_SEARCH_HISTORY = [
  'Lofi hip hop',
  'Synthwave chill',
  'Coldplay',
  'Daft Punk',
];

const INITIAL_SONGS = [
  { id: '1', title: 'Midnight City Dreams', artist: 'Synthwave Chill', duration: '3:45' },
  { id: '2', title: 'Acoustic Morning Breeze', artist: 'Indie Folk Session', duration: '4:20' },
  { id: '3', title: 'Deep Focus Lo-Fi Study', artist: 'Chillhop Beats', duration: '2:55' },
  { id: '4', title: 'Golden Hour Reflections', artist: 'Piano Melody', duration: '3:10' },
];

const INITIAL_PLAYLISTS = [
  {
    id: 'pl_1',
    title: 'Focus & Study',
    coverImage: null,
    color: '#0A84FF',
    songs: [
      { id: '3', title: 'Deep Focus Lo-Fi Study', artist: 'Chillhop Beats', duration: '2:55' },
      { id: '1', title: 'Midnight City Dreams', artist: 'Synthwave Chill', duration: '3:45' },
    ],
  },
  {
    id: 'pl_2',
    title: 'Acoustic Morning',
    coverImage: null,
    color: '#FF9F0A',
    songs: [
      { id: '2', title: 'Acoustic Morning Breeze', artist: 'Indie Folk Session', duration: '4:20' },
      { id: '4', title: 'Golden Hour Reflections', artist: 'Piano Melody', duration: '3:10' },
    ],
  },
];

export const PlaylistProvider = ({ children }) => {
  const [allSongs, setAllSongs] = useState(INITIAL_SONGS);
  const [playlists, setPlaylists] = useState(INITIAL_PLAYLISTS);
  const [likedSongIds, setLikedSongIds] = useState(['1', '3']); // Default initial favorites
  const [searchHistory, setSearchHistory] = useState(INITIAL_SEARCH_HISTORY);

  // Playback State
  const [currentlyPlayingSong, setCurrentlyPlayingSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState(INITIAL_SONGS);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  // Sleep Timer State (seconds remaining)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null);
  const timerIntervalRef = useRef(null);

  // Global Download Tracking State: null | { isDownloading, songTitle, progress, stage, isComplete, isError }
  const [downloadProgress, setDownloadProgress] = useState(null);
  const downloadTimerRef = useRef(null);

  const startDownloadTracking = (songTitle) => {
    if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
    setDownloadProgress({
      isDownloading: true,
      songTitle: songTitle || 'Audio Track',
      progress: 20,
      stage: 'Connecting to YouTube...',
    });
  };

  const updateDownloadTracking = (progress, stage) => {
    setDownloadProgress(prev => prev ? { ...prev, progress, stage } : null);
  };

  const completeDownloadTracking = (songTitle) => {
    if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
    setDownloadProgress({
      isDownloading: false,
      isComplete: true,
      songTitle: songTitle || 'Audio Track',
      progress: 100,
      stage: 'Saved to Library',
    });
    setTimeout(() => {
      setDownloadProgress(null);
    }, 3200);
  };

  const cancelDownloadTracking = (errorMsg = null) => {
    if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
    if (errorMsg) {
      setDownloadProgress({
        isDownloading: false,
        isError: true,
        progress: 0,
        stage: `Download failed: ${errorMsg}`,
      });
      setTimeout(() => setDownloadProgress(null), 3500);
    } else {
      setDownloadProgress(null);
    }
  };

  // Ref to hold current state inside audio status callbacks without stale closures
  const stateRef = useRef({
    allSongs,
    playbackQueue,
    currentlyPlayingSong,
    isLooping,
    isShuffle,
    isPlaying,
  });

  useEffect(() => {
    stateRef.current = {
      allSongs,
      playbackQueue,
      currentlyPlayingSong,
      isLooping,
      isShuffle,
      isPlaying,
    };
  }, [allSongs, playbackQueue, currentlyPlayingSong, isLooping, isShuffle, isPlaying]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedSongs = await AsyncStorage.getItem(ALL_SONGS_STORAGE_KEY);
        const storedPlaylists = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
        const storedLiked = await AsyncStorage.getItem(LIKED_SONGS_STORAGE_KEY);
        const storedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);

        if (storedSongs) {
          const parsed = JSON.parse(storedSongs);
          setAllSongs(parsed);
          setPlaybackQueue(parsed);
        }
        if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
        if (storedLiked) setLikedSongIds(JSON.parse(storedLiked));
        if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to load playlist data", e);
      }
    };
    loadData();
  }, []);

  // Sleep Timer Interval Effect
  useEffect(() => {
    if (sleepTimerRemaining !== null && sleepTimerRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            stopAudio();
            setIsPlaying(false);
            setCurrentlyPlayingSong(null);
            alert("⏰ Sleep Timer: Music playback has stopped.");
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sleepTimerRemaining !== null]);

  const startSleepTimer = (minutes) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSleepTimerMinutes(minutes);
    setSleepTimerRemaining(minutes * 60);
  };

  const cancelSleepTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSleepTimerRemaining(null);
    setSleepTimerMinutes(null);
  };

  // Status callback for expo-av audio updates
  const handlePlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`Playback Error: ${status.error}`);
      }
      return;
    }

    setPositionMillis(status.positionMillis || 0);
    if (status.durationMillis) {
      setDurationMillis(status.durationMillis);
    }
    setIsPlaying(status.isPlaying);

    // Auto-advance to next song upon completion
    if (status.didJustFinish) {
      if (stateRef.current.isLooping) {
        seekAudio(0);
        resumeAudio();
      } else {
        playNextSong();
      }
    }
  };

  // Playback Control
  const playSong = async (song, customQueue = null) => {
    setCurrentlyPlayingSong(song);
    setPositionMillis(0);

    if (customQueue && customQueue.length > 0) {
      setPlaybackQueue(customQueue);
    } else if (playbackQueue.length === 0) {
      setPlaybackQueue(allSongs);
    }

    if (song.uri) {
      const sound = await playAudio(song.uri, handlePlaybackStatusUpdate);
      if (sound) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    } else {
      // Simulate progress for sample offline tracks without remote files
      setIsPlaying(true);
      setDurationMillis(210000); // 3m 30s
    }
  };

  const togglePlaySong = async (song = null, customQueue = null) => {
    const target = song || currentlyPlayingSong || playbackQueue[0] || allSongs[0];
    if (!target) return;

    if (currentlyPlayingSong?.id === target.id) {
      if (isPlaying) {
        await pauseAudio();
        setIsPlaying(false);
      } else {
        await resumeAudio();
        setIsPlaying(true);
      }
    } else {
      await playSong(target, customQueue);
    }
  };

  const playNextSong = async () => {
    const queue = stateRef.current.playbackQueue.length > 0 
      ? stateRef.current.playbackQueue 
      : stateRef.current.allSongs;
      
    if (!queue || queue.length === 0) return;

    const current = stateRef.current.currentlyPlayingSong;
    if (stateRef.current.isShuffle) {
      // Pick random song different from current
      const available = queue.filter(s => s.id !== current?.id);
      const nextRandom = available.length > 0 
        ? available[Math.floor(Math.random() * available.length)] 
        : queue[0];
      await playSong(nextRandom);
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === current?.id);
    let nextIndex = 0;
    if (currentIndex !== -1 && currentIndex + 1 < queue.length) {
      nextIndex = currentIndex + 1;
    }
    await playSong(queue[nextIndex]);
  };

  const playPrevSong = async () => {
    const queue = stateRef.current.playbackQueue.length > 0 
      ? stateRef.current.playbackQueue 
      : stateRef.current.allSongs;

    if (!queue || queue.length === 0) return;

    // If current track is past 3 seconds, restart current track
    if (positionMillis > 3000) {
      await seekTo(0);
      return;
    }

    const current = stateRef.current.currentlyPlayingSong;
    const currentIndex = queue.findIndex(s => s.id === current?.id);
    let prevIndex = queue.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    await playSong(queue[prevIndex]);
  };

  const seekTo = async (millis) => {
    setPositionMillis(millis);
    await seekAudio(millis);
  };

  const toggleLoop = () => {
    const nextVal = !isLooping;
    setIsLooping(nextVal);
    setLoopingAudio(nextVal);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const savePlaylists = async (newList) => {
    setPlaylists(newList);
    await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(newList));
  };

  const saveAllSongs = async (newList) => {
    setAllSongs(newList);
    setPlaybackQueue(newList);
    await AsyncStorage.setItem(ALL_SONGS_STORAGE_KEY, JSON.stringify(newList));
  };

  const addSongToLibrary = async (newSong) => {
    // Prevent duplicate entries by id or title
    const exists = allSongs.some(
      s => (s.id && s.id === newSong.id) || 
           (s.title && newSong.title && s.title.toLowerCase().trim() === newSong.title.toLowerCase().trim())
    );
    if (exists) {
      return false;
    }
    const updated = [newSong, ...allSongs];
    await saveAllSongs(updated);
    return true;
  };

  // Import Song directly from local memory/device
  const importSongFromDevice = async () => {
    const imported = await pickAudioFromDevice();
    if (imported) {
      await addSongToLibrary(imported);
      return imported;
    }
    return null;
  };

  const createPlaylist = async (title, coverImage = null, color = '#FF2D55') => {
    const newPlaylist = {
      id: 'pl_' + Date.now(),
      title: title.trim() || 'Untitled Playlist',
      coverImage: coverImage || null,
      color: color || '#FF2D55',
      songs: [],
    };
    const updated = [newPlaylist, ...playlists];
    await savePlaylists(updated);
    return newPlaylist;
  };

  const deletePlaylist = async (playlistId) => {
    const updated = playlists.filter(p => p.id !== playlistId);
    await savePlaylists(updated);
  };

  const updatePlaylistCover = async (playlistId, coverImage) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, coverImage };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  const addSongToPlaylist = async (playlistId, song) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, songs: [...p.songs, song] };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  const removeSongFromPlaylist = async (playlistId, indexToRemove) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        const newSongs = [...p.songs];
        newSongs.splice(indexToRemove, 1);
        return { ...p, songs: newSongs };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  const reorderSongInPlaylist = async (playlistId, fromIndex, toIndex) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        const newSongs = [...p.songs];
        if (fromIndex < 0 || fromIndex >= newSongs.length || toIndex < 0 || toIndex >= newSongs.length) {
          return p;
        }
        const [movedItem] = newSongs.splice(fromIndex, 1);
        newSongs.splice(toIndex, 0, movedItem);
        return { ...p, songs: newSongs };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  const shufflePlaylist = async (playlistId) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        const shuffled = [...p.songs];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return { ...p, songs: shuffled };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  // Liked / Favorites System
  const toggleLikeSong = async (songId) => {
    if (!songId) return;
    const isLiked = likedSongIds.includes(songId);
    const updated = isLiked 
      ? likedSongIds.filter(id => id !== songId) 
      : [...likedSongIds, songId];
    setLikedSongIds(updated);
    await AsyncStorage.setItem(LIKED_SONGS_STORAGE_KEY, JSON.stringify(updated));
  };

  const isSongLiked = (songId) => {
    if (!songId) return false;
    return likedSongIds.includes(songId);
  };

  const likedSongs = allSongs.filter(s => likedSongIds.includes(s.id));

  // Search History System
  const addSearchQuery = async (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    const filtered = searchHistory.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 12);
    setSearchHistory(updated);
    await AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  const removeSearchQuery = async (query) => {
    const updated = searchHistory.filter(q => q !== query);
    setSearchHistory(updated);
    await AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  const clearSearchHistory = async () => {
    setSearchHistory([]);
    await AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify([]));
  };

  return (
    <PlaylistContext.Provider value={{
      allSongs,
      playlists,
      currentlyPlayingSong,
      isPlaying,
      positionMillis,
      durationMillis,
      isLooping,
      isShuffle,
      isPlayerExpanded,
      sleepTimerRemaining,
      sleepTimerMinutes,
      likedSongIds,
      likedSongs,
      toggleLikeSong,
      isSongLiked,
      searchHistory,
      addSearchQuery,
      removeSearchQuery,
      clearSearchHistory,
      downloadProgress,
      startDownloadTracking,
      updateDownloadTracking,
      completeDownloadTracking,
      cancelDownloadTracking,
      addSongToLibrary,
      createPlaylist,
      deletePlaylist,
      updatePlaylistCover,
      addSongToPlaylist,
      removeSongFromPlaylist,
      reorderSongInPlaylist,
      shufflePlaylist,
      playSong,
      togglePlaySong,
      playNextSong,
      playPrevSong,
      seekTo,
      toggleLoop,
      toggleShuffle,
      setIsPlayerExpanded,
      startSleepTimer,
      cancelSleepTimer,
      importSongFromDevice,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
};
