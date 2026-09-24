import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DELETE_BTN_WIDTH = 84;
const SWIPE_SNAP_THRESHOLD = -38;

export default function SwipeablePlaylistItem({
  item,
  index,
  totalCount,
  isPlayingThis = false,
  isSmart = false,
  cardBg = '#FFFFFF',
  surfaceColor = '#FFFFFF',
  borderColor = 'rgba(0,0,0,0.06)',
  textColor = '#000000',
  subtextColor = '#8E8E93',
  accentColor = '#FF2D55',
  activeSwipeId = null,
  setActiveSwipeId = () => {},
  onPlay = () => {},
  onDelete = () => {},
  onReorder = () => {},
  onToggleLike = () => {},
  isLiked = false,
  onDragStart = () => {},
  onDragEnd = () => {},
}) {
  // Swipe State
  const panX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  // Animate delete button opacity: 0 when closed, fades in only when swiped left
  const deleteOpacity = panX.interpolate({
    inputRange: [-DELETE_BTN_WIDTH, -6, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  // Drag State
  const panY = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [targetIndex, setTargetIndex] = useState(index);

  const rowHeightRef = useRef(74);
  const indexRef = useRef(index);
  indexRef.current = index;
  const totalCountRef = useRef(totalCount);
  totalCountRef.current = totalCount;

  // Auto-close when another item begins swiping
  useEffect(() => {
    if (activeSwipeId && activeSwipeId !== item.id && isOpen) {
      closeSwipe();
    }
  }, [activeSwipeId]);

  const closeSwipe = () => {
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 4,
      speed: 16,
    }).start(() => {
      setIsOpen(false);
      if (activeSwipeId === item.id) {
        setActiveSwipeId(null);
      }
    });
  };

  const openSwipe = () => {
    Animated.spring(panX, {
      toValue: -DELETE_BTN_WIDTH,
      useNativeDriver: false,
      bounciness: 4,
      speed: 16,
    }).start(() => {
      setIsOpen(true);
      setActiveSwipeId(item.id);
    });
  };

  const handleDeletePress = () => {
    // Smooth exit animation
    Animated.timing(panX, {
      toValue: -400,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      onDelete();
    });
  };

  // -------------------------------------------------------------
  // HORIZONTAL SWIPE-TO-DELETE PAN RESPONDER
  // -------------------------------------------------------------
  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only claim horizontal swipes when moving predominantly along X
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
        );
      },
      onPanResponderGrant: () => {
        setActiveSwipeId(item.id);
        panX.setOffset(isOpen ? -DELETE_BTN_WIDTH : 0);
        panX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentOffset = isOpen ? -DELETE_BTN_WIDTH : 0;
        const nextX = currentOffset + gestureState.dx;
        // Clamp: cannot swipe right past 0, limit left overscroll
        if (nextX <= 0 && nextX >= -DELETE_BTN_WIDTH - 30) {
          panX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panX.flattenOffset();
        const currentOffset = isOpen ? -DELETE_BTN_WIDTH : 0;
        const finalX = currentOffset + gestureState.dx;

        if (finalX < SWIPE_SNAP_THRESHOLD) {
          openSwipe();
        } else {
          closeSwipe();
        }
      },
      onPanResponderTerminate: () => {
        panX.flattenOffset();
        closeSwipe();
      },
    })
  ).current;

  // -------------------------------------------------------------
  // VERTICAL DRAG-TO-REORDER PAN RESPONDER (EXCLUSIVELY ON HANDLE)
  // -------------------------------------------------------------
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        if (isOpen) closeSwipe();
        setIsDragging(true);
        setTargetIndex(indexRef.current);
        panY.setValue(0);
        onDragStart(indexRef.current);
      },
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
        const delta = Math.round(gestureState.dy / rowHeightRef.current);
        const newTarget = Math.max(
          0,
          Math.min(totalCountRef.current - 1, indexRef.current + delta)
        );
        setTargetIndex(newTarget);
      },
      onPanResponderRelease: (_, gestureState) => {
        const delta = Math.round(gestureState.dy / rowHeightRef.current);
        const finalTarget = Math.max(
          0,
          Math.min(totalCountRef.current - 1, indexRef.current + delta)
        );

        setIsDragging(false);
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: false,
          speed: 18,
        }).start();
        onDragEnd();

        if (finalTarget !== indexRef.current) {
          onReorder(indexRef.current, finalTarget);
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: false,
          speed: 18,
        }).start();
        onDragEnd();
      },
    })
  ).current;

  const handleRowPress = () => {
    if (isOpen) {
      closeSwipe();
    } else {
      onPlay();
    }
  };

  return (
    <View
      style={[
        styles.outerContainer,
        isDragging && { zIndex: 9999, elevation: 14 },
      ]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) rowHeightRef.current = h + 10;
      }}
    >
      {/* Target Slot Indicator Pill (Displayed above row while dragging) */}
      {isDragging && (
        <View style={[styles.targetSlotPill, { backgroundColor: accentColor }]}>
          <Ionicons
            name="swap-vertical"
            size={12}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.targetSlotText}>
            Moving to position #{targetIndex + 1}
          </Text>
        </View>
      )}

      {/* Vertical Drag Container */}
      <Animated.View
        style={[
          styles.dragWrapper,
          {
            transform: [
              { translateY: panY },
              { scale: isDragging ? 1.03 : 1 },
            ],
            zIndex: isDragging ? 9999 : 1,
          },
          isDragging && styles.draggingCardShadow,
        ]}
      >
        {/* Background Revealed Layer: Crimson Delete Button (Opacity 0 when closed) */}
        <Animated.View 
          style={[
            styles.deleteBackground, 
            { opacity: deleteOpacity }
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSmart ? 'heart-dislike' : 'trash-outline'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.deleteButtonText}>
              {isSmart ? 'Unlike' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Foreground Layer: Swipeable Song Card */}
        <Animated.View
          style={[
            styles.foregroundCard,
            {
              backgroundColor: cardBg,
              borderColor: isDragging
                ? accentColor
                : isPlayingThis
                ? accentColor
                : borderColor,
              borderWidth: isDragging ? 1.5 : isPlayingThis ? 1.5 : 1,
              transform: [{ translateX: panX }],
            },
          ]}
          {...swipePanResponder.panHandlers}
        >
          {/* Order Index Badge */}
          <View style={styles.orderBadge}>
            <Text style={[styles.orderNumber, { color: subtextColor }]}>
              {index + 1}
            </Text>
          </View>

          {/* Song Artwork & Title/Artist (Tappable to play or close swipe) */}
          <TouchableOpacity
            style={styles.songMainTouch}
            onPress={handleRowPress}
            activeOpacity={0.75}
          >
            {item.coverImage ? (
              <Image
                source={{ uri: item.coverImage }}
                style={styles.artworkSquare}
              />
            ) : (
              <View
                style={[
                  styles.artworkSquare,
                  {
                    backgroundColor: isPlayingThis
                      ? accentColor
                      : accentColor + '18',
                  },
                ]}
              >
                <Ionicons
                  name={isPlayingThis ? 'volume-high' : 'musical-note'}
                  size={20}
                  color={isPlayingThis ? '#FFFFFF' : accentColor}
                />
              </View>
            )}

            <View style={styles.metaContainer}>
              <Text
                style={[
                  styles.songTitle,
                  { color: isPlayingThis ? accentColor : textColor },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[styles.songArtist, { color: subtextColor }]} numberOfLines={1}>
                {item.artist} • {item.duration}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Heart Button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleLike();
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? '#FF2D55' : subtextColor}
            />
          </TouchableOpacity>

          {/* Drag Handle: Exclusively for custom playlists with >1 track */}
          {!isSmart && totalCount > 1 ? (
            <View
              style={[
                styles.dragHandle,
                Platform.OS === 'web' && {
                  cursor: isDragging ? 'grabbing' : 'grab',
                },
              ]}
              {...dragPanResponder.panHandlers}
            >
              <Ionicons
                name="reorder-two"
                size={24}
                color={isDragging ? accentColor : subtextColor}
              />
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  targetSlotPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  targetSlotText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dragWrapper: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  draggingCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DELETE_BTN_WIDTH,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  foregroundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    zIndex: 2,
  },
  orderBadge: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
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
    marginRight: 6,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  songArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  heartBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});

