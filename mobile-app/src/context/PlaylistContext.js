import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playAudio, pauseAudio, resumeAudio, stopAudio } from '../services/AudioPlayer';
import { pickAudioFromDevice } from '../services/LocalFilePicker';

export const PlaylistContext = createContext({
  allSongs: [],
  playlists: [],
  currentlyPlayingSong: null,
  isPlaying: false,
  sleepTimerRemaining: null,
  sleepTimerMinutes: null,
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
  startSleepTimer: () => {},
  cancelSleepTimer: () => {},
  importSongFromDevice: async () => {},
});

const PLAYLISTS_STORAGE_KEY = '@app_playlists_v2';
const ALL_SONGS_STORAGE_KEY = '@app_all_songs_v2';

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

  // Active Playback State
  const [currentlyPlayingSong, setCurrentlyPlayingSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sleep Timer State (seconds remaining)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedSongs = await AsyncStorage.getItem(ALL_SONGS_STORAGE_KEY);
        const storedPlaylists = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
        if (storedSongs) setAllSongs(JSON.parse(storedSongs));
        if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
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
            // STOP MUSIC WHEN TIMER RUNS OUT
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

  // Playback Control
  const playSong = async (song) => {
    setCurrentlyPlayingSong(song);
    setIsPlaying(true);
    if (song.uri) {
      await playAudio(song.uri);
    }
  };

  const togglePlaySong = async (song) => {
    if (currentlyPlayingSong?.id === song.id) {
      if (isPlaying) {
        await pauseAudio();
        setIsPlaying(false);
      } else {
        await resumeAudio();
        setIsPlaying(true);
      }
    } else {
      await playSong(song);
    }
  };

  const savePlaylists = async (newList) => {
    setPlaylists(newList);
    await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(newList));
  };

  const saveAllSongs = async (newList) => {
    setAllSongs(newList);
    await AsyncStorage.setItem(ALL_SONGS_STORAGE_KEY, JSON.stringify(newList));
  };

  const addSongToLibrary = async (newSong) => {
    const updated = [newSong, ...allSongs];
    await saveAllSongs(updated);
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

  // Shuffle order: shuffles the song order in the playlist
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

  return (
    <PlaylistContext.Provider value={{
      allSongs,
      playlists,
      currentlyPlayingSong,
      isPlaying,
      sleepTimerRemaining,
      sleepTimerMinutes,
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
      startSleepTimer,
      cancelSleepTimer,
      importSongFromDevice,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
};
