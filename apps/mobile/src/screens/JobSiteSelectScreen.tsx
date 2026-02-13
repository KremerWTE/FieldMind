import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import apiService from '../services/api.service';

/**
 * JobSiteSelectScreen - Quick building/project selection for field workers
 *
 * Features:
 * - GPS-based "Nearby Sites" - shows closest buildings first
 * - Recent sites for quick access
 * - Simple search
 * - Large tap targets for gloved hands
 * - Works offline (cached sites)
 */

interface Building {
  id: string;
  name: string;
  address: string;
  distance?: number; // in meters
  geoLat?: number;
  geoLng?: number;
}

interface Project {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  status: string;
}

export default function JobSiteSelectScreen({ navigation }: any) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [nearbyBuildings, setNearbyBuildings] = useState<Building[]>([]);
  const [recentSites, setRecentSites] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [selectedView, setSelectedView] = useState<'nearby' | 'all' | 'recent'>('nearby');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current location for "Nearby" feature
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }

      // Fetch buildings from API
      const buildingsResponse = await apiService.getBuildings();
      const buildingsData: Building[] = buildingsResponse.items.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        geoLat: b.geoLat,
        geoLng: b.geoLng
      }));

      setBuildings(buildingsData);

      // Fetch projects from API
      const projectsResponse = await apiService.getProjects({ status: 'active' });
      const projectsData: Project[] = projectsResponse.items.map((p: any) => {
        const building = buildingsData.find(b => b.id === p.buildingId);
        return {
          id: p.id,
          name: p.name,
          buildingId: p.buildingId,
          buildingName: building?.name || 'Unknown Building',
          status: p.status
        };
      });

      setProjects(projectsData);

      // Calculate distances if location available
      if (currentLocation) {
        const buildingsWithDistance = mockBuildings.map(building => ({
          ...building,
          distance: building.geoLat && building.geoLng
            ? calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                building.geoLat,
                building.geoLng
              )
            : undefined
        }));

        const sorted = buildingsWithDistance
          .filter(b => b.distance !== undefined)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));

        setNearbyBuildings(sorted);
      }

      // Load recent sites from local storage
      // TODO: Load from AsyncStorage
      setRecentSites([]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);

      // Try to load cached data if API fails
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const cachedBuildings = await AsyncStorage.getItem('cachedBuildings');
        const cachedProjects = await AsyncStorage.getItem('cachedProjects');

        if (cachedBuildings) setBuildings(JSON.parse(cachedBuildings));
        if (cachedProjects) setProjects(JSON.parse(cachedProjects));
      } catch (cacheError) {
        console.error('Failed to load cached data:', cacheError);
      }

      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const selectProject = (project: Project) => {
    const building = buildings.find(b => b.id === project.buildingId);

    // Save to recent sites
    // TODO: Save to AsyncStorage

    // Navigate to QuickCapture
    navigation.navigate('QuickCapture', {
      project,
      building
    });
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.buildingName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayProjects = () => {
    if (searchQuery) {
      return filteredProjects;
    }

    switch (selectedView) {
      case 'nearby':
        if (nearbyBuildings.length === 0) {
          return projects; // Fallback to all if no location
        }
        // Show projects for nearby buildings
        const nearbyBuildingIds = nearbyBuildings.slice(0, 5).map(b => b.id);
        return projects.filter(p => nearbyBuildingIds.includes(p.buildingId));

      case 'recent':
        return recentSites;

      case 'all':
      default:
        return projects;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading job sites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Job Site</Text>
        <Text style={styles.headerSubtitle}>
          {currentLocation ? '📍 Using your location' : 'Showing all sites'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search sites or projects..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* View Tabs */}
      {!searchQuery && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedView === 'nearby' && styles.tabActive]}
            onPress={() => setSelectedView('nearby')}
          >
            <Text style={[styles.tabText, selectedView === 'nearby' && styles.tabTextActive]}>
              📍 Nearby
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedView === 'recent' && styles.tabActive]}
            onPress={() => setSelectedView('recent')}
          >
            <Text style={[styles.tabText, selectedView === 'recent' && styles.tabTextActive]}>
              🕐 Recent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedView === 'all' && styles.tabActive]}
            onPress={() => setSelectedView('all')}
          >
            <Text style={[styles.tabText, selectedView === 'all' && styles.tabTextActive]}>
              📋 All Sites
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Project List */}
      <ScrollView style={styles.projectList}>
        {getDisplayProjects().length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {selectedView === 'recent'
                ? '🕐 No recent sites yet'
                : searchQuery
                ? '🔍 No sites found'
                : '📋 No active projects'}
            </Text>
          </View>
        ) : (
          getDisplayProjects().map(project => {
            const building = buildings.find(b => b.id === project.buildingId);
            return (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => selectProject(project)}
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  {project.status === 'active' && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.buildingName}>🏢 {project.buildingName}</Text>

                {building?.address && (
                  <Text style={styles.address}>📍 {building.address}</Text>
                )}

                {building?.distance && (
                  <Text style={styles.distance}>
                    📏 {formatDistance(building.distance)}
                  </Text>
                )}

                <View style={styles.projectFooter}>
                  <Text style={styles.startButton}>Start Capturing →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Quick Tips (show when empty) */}
      {selectedView === 'nearby' && nearbyBuildings.length === 0 && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            💡 Tip: Enable location services to see nearby job sites automatically
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dbeafe',
    marginTop: 4,
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  projectList: {
    flex: 1,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#9ca3af',
    textAlign: 'center',
  },
  projectCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  buildingName: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 8,
  },
  projectFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
  },
  startButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: '#fef3c7',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  tipText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
