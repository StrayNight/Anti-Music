import { Audio } from 'expo-av';

let soundObject = null;
let currentCallback = null;

export const setPlaybackCallback = (callback) => {
  currentCallback = callback;
  if (soundObject && currentCallback) {
    soundObject.setOnPlaybackStatusUpdate(currentCallback);
  }
};

export const playAudio = async (uri, onPlaybackStatusUpdate = null) => {
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }

    if (onPlaybackStatusUpdate) {
      currentCallback = onPlaybackStatusUpdate;
    }

    // Configure background audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, progressUpdateIntervalMillis: 500 },
      currentCallback
    );

    soundObject = sound;
    return sound;
  } catch (error) {
    console.error("Error playing audio:", error);
    return null;
  }
};

export const pauseAudio = async () => {
  try {
    if (soundObject) {
      await soundObject.pauseAsync();
    }
  } catch (error) {
    console.error("Error pausing audio:", error);
  }
};

export const resumeAudio = async () => {
  try {
    if (soundObject) {
      await soundObject.playAsync();
    }
  } catch (error) {
    console.error("Error resuming audio:", error);
  }
};

export const seekAudio = async (positionMillis) => {
  try {
    if (soundObject) {
      await soundObject.setPositionAsync(positionMillis);
    }
  } catch (error) {
    console.error("Error seeking audio:", error);
  }
};

export const setLoopingAudio = async (isLooping) => {
  try {
    if (soundObject) {
      await soundObject.setIsLoopingAsync(isLooping);
    }
  } catch (error) {
    console.error("Error setting loop mode:", error);
  }
};

export const stopAudio = async () => {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error("Error stopping audio:", error);
  }
};
