import { Platform } from 'react-native';

export const pickAudioFromDevice = async () => {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*, .mp3, .m4a, .wav, .aac, .ogg, .flac';
        input.style.display = 'none';

        input.onchange = (event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            const file = files[0];
            const fileUrl = URL.createObjectURL(file);
            const rawName = file.name || 'Imported Song';
            const cleanTitle = rawName.replace(/\.[^/.]+$/, ""); // Strip file extension

            resolve({
              id: 'local_' + Date.now(),
              title: cleanTitle,
              artist: 'Local Memory Audio',
              duration: 'Local File',
              uri: fileUrl,
              isLocalFile: true,
            });
          } else {
            resolve(null);
          }
          document.body.removeChild(input);
        };

        input.oncancel = () => {
          resolve(null);
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        document.body.appendChild(input);
        input.click();
      } catch (err) {
        console.error("Web file picker error:", err);
        resolve(null);
      }
    });
  } else {
    // Mobile / Native Environment
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const rawName = asset.name || 'Imported Song';
        const cleanTitle = rawName.replace(/\.[^/.]+$/, "");

        return {
          id: 'local_' + Date.now(),
          title: cleanTitle,
          artist: 'Device Memory',
          duration: 'Local File',
          uri: asset.uri,
          isLocalFile: true,
        };
      }
    } catch (e) {
      console.warn("DocumentPicker fallback:", e);
    }
    return null;
  }
};

