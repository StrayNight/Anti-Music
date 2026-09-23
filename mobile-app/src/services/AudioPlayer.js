import { Audio } from 'expo-av';

let soundObject = null;

export const playAudio = async (uri) => {
    try {
        if (soundObject) {
            await soundObject.unloadAsync();
        }
        
        // Configure background audio playing
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true }
        );
        soundObject = sound;
        return sound;
    } catch (error) {
        console.error("Error playing audio", error);
    }
};

export const pauseAudio = async () => {
    if (soundObject) {
        await soundObject.pauseAsync();
    }
};

export const resumeAudio = async () => {
    if (soundObject) {
        await soundObject.playAsync();
    }
};

export const stopAudio = async () => {
    if (soundObject) {
        await soundObject.stopAsync();
        await soundObject.unloadAsync();
        soundObject = null;
    }
};

