import React, { useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { PlaylistContext } from '../context/PlaylistContext';

export default function DownloadIndicator() {
  const { surfaceColor, accentColor, isDark } = useContext(ThemeContext);
  const { downloadProgress, cancelDownloadTracking } = useContext(PlaylistContext);

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';

  useEffect(() => {
    if (downloadProgress) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [downloadProgress !== null]);

  if (!downloadProgress) return null;

  const isComplete = downloadProgress.isComplete;
  const isError = downloadProgress.isError;
  const progressPercent = Math.min(100, Math.max(5, downloadProgress.progress || 10));

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: isDark
            ? 'rgba(28, 32, 42, 0.94)'
            : 'rgba(255, 255, 255, 0.94)',
          borderColor: isComplete
            ? 'rgba(16, 185, 129, 0.4)'
            : isError
            ? 'rgba(255, 59, 48, 0.4)'
            : isDark
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left Status Icon */}
        <View style={styles.iconWrapper}>
          {isComplete ? (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          ) : isError ? (
            <Ionicons name="alert-circle" size={24} color="#FF3B30" />
          ) : (
            <View style={styles.spinnerWrapper}>
              <ActivityIndicator size="small" color={accentColor} />
            </View>
          )}
        </View>

        {/* Text Information */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.songTitle, { color: textColor }]} numberOfLines={1}>
              {downloadProgress.songTitle || 'Audio Track'}
            </Text>
            {isComplete && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>READY</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.stageText,
              { color: isComplete ? '#10B981' : isError ? '#FF3B30' : subtextColor },
            ]}
            numberOfLines={1}
          >
            {downloadProgress.stage || 'Downloading...'}
          </Text>
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => cancelDownloadTracking()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={subtextColor} />
        </TouchableOpacity>
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: isComplete
                ? '#10B981'
                : isError
                ? '#FF3B30'
                : accentColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 70 : 86,
    left: 16,
    right: 16,
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    zIndex: 99999,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  spinnerWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stageText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  dismissBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

