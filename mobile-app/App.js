import React, { useContext, useState, useEffect } from 'react';
import { 
  ImageBackground, 
  View, 
  StyleSheet, 
  Platform, 
  Text, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { PlaylistProvider, PlaylistContext } from './src/context/PlaylistContext';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MiniPlayer from './src/components/MiniPlayer';
import FullScreenPlayer from './src/components/FullScreenPlayer';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { id: 'library', label: 'Library', activeIcon: 'musical-notes', inactiveIcon: 'musical-notes-outline' },
  { id: 'search', label: 'Download', activeIcon: 'cloud-download', inactiveIcon: 'cloud-download-outline' },
  { id: 'settings', label: 'Customize', activeIcon: 'options', inactiveIcon: 'options-outline' },
];

const MainApp = () => {
  const { 
    dominantColor, 
    surfaceColor, 
    accentColor, 
    backgroundImage, 
    overlayOpacity,
    isDark 
  } = useContext(ThemeContext);

  const playlistContext = useContext(PlaylistContext) || {};
  const sleepTimerRemaining = playlistContext.sleepTimerRemaining || null;

  const [activeTab, setActiveTab] = useState('library');

  // Keep web body background perfectly in sync with dominant canvas
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = dominantColor;
      if (document.documentElement) {
        document.documentElement.style.backgroundColor = dominantColor;
      }
    }
  }, [dominantColor]);

  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1AA' : '#8E8E93';

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'library':
        return <LibraryScreen />;
      case 'search':
        return <SearchScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <LibraryScreen />;
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'library':
        return 'Library';
      case 'search':
        return 'Download Audio';
      case 'settings':
        return 'Appearance';
      default:
        return 'Music';
    }
  };

  const content = (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Apple-style Soft Header */}
      <View style={[
        styles.appleHeader, 
        { 
          backgroundColor: backgroundImage 
            ? (isDark ? 'rgba(23, 27, 34, 0.75)' : 'rgba(255, 255, 255, 0.75)') 
            : surfaceColor,
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
        }
      ]}>
        <View>
          <Text style={[styles.headerSubtitle, { color: accentColor }]}>ANTI-MUSIC</Text>
          <Text style={[styles.headerTitle, { color: textColor }]}>{getHeaderTitle()}</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: sleepTimerRemaining ? '#FF950020' : accentColor + '20' }]}>
          <Text style={[styles.headerBadgeText, { color: sleepTimerRemaining ? '#FF9500' : accentColor }]}>
            {sleepTimerRemaining ? `⏰ ${Math.floor(sleepTimerRemaining / 60)}:${sleepTimerRemaining % 60 < 10 ? '0' : ''}${sleepTimerRemaining % 60}` : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Screen Viewport: ONLY active screen exists in DOM (No piling up ever!) */}
      <View style={styles.screenContainer}>
        {renderActiveScreen()}
      </View>

      {/* Floating Apple Mini-Player */}
      <MiniPlayer />

      {/* Apple-style Floating Frosted Pill Tab Bar */}
      <View style={styles.tabBarWrapper}>
        <View style={[
          styles.floatingTabBar,
          {
            backgroundColor: backgroundImage 
              ? (isDark ? 'rgba(20, 24, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)') 
              : surfaceColor,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
            shadowColor: isDark ? '#000000' : '#8E8E93',
          }
        ]}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabItem,
                  isActive && {
                    backgroundColor: accentColor + '18',
                    borderRadius: 20,
                  }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.inactiveIcon}
                  size={22}
                  color={isActive ? accentColor : subtextColor}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? accentColor : subtextColor, fontWeight: isActive ? '700' : '500' }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Expandable Full-Screen Apple Player Modal */}
      <FullScreenPlayer />
    </SafeAreaView>
  );

  if (backgroundImage) {
    return (
      <ImageBackground 
        source={{ uri: backgroundImage }} 
        style={[styles.rootCanvas, { backgroundColor: dominantColor }]}
        resizeMode="cover"
      >
          <View style={[
            styles.overlay, 
            { backgroundColor: isDark ? `rgba(0, 0, 0, ${overlayOpacity})` : `rgba(255, 255, 255, ${overlayOpacity})` }
          ]}>
            <View style={styles.desktopWrapper}>
              {content}
            </View>
          </View>
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.rootCanvas, { backgroundColor: dominantColor }]}>
      <View style={styles.desktopWrapper}>
        {content}
      </View>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PlaylistProvider>
          <MainApp />
        </PlaylistProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
  },
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  desktopWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : '100%',
    alignSelf: 'center',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    height: '100%',
  },
  appleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 18 : 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  screenContainer: {
    flex: 1,
  },
  tabBarWrapper: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 18 : 12,
    paddingTop: 6,
  },
  floatingTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 30,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 3,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
