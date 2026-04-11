import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Gradačac center coordinates
const GRADACAC_CENTER = {
  latitude: 44.8797,
  longitude: 18.4275,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface LocationItem {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  description?: string;
  working_hours?: string;
}

export default function Index() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await requestLocationPermission();
    await fetchCategories();
    await fetchLocations();
    setLoading(false);
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLocations = async (category?: string) => {
    try {
      const url = category
        ? `${BACKEND_URL}/api/locations?category=${category}`
        : `${BACKEND_URL}/api/locations`;
      const response = await axios.get(url);
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      fetchLocations();
    } else {
      setSelectedCategory(categoryId);
      fetchLocations(categoryId);
    }
  };

  const handleMarkerPress = (location: LocationItem) => {
    setSelectedLocation(location);
    setModalVisible(true);
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert('Lokacija', 'Lokacija nije dostupna');
    }
  };

  const centerOnGradacac = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(GRADACAC_CENTER);
    }
  };

  const openNavigation = (location: LocationItem) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
      android: `geo:0,0?q=${location.latitude},${location.longitude}(${location.name})`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#FF6B6B';
  };

  const getCategoryIcon = (categoryId: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      restaurant: 'restaurant',
      market: 'cart',
      auto_service: 'car',
      cafe: 'cafe',
      pharmacy: 'medkit',
      gas_station: 'water',
    };
    return iconMap[categoryId] || 'location';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90A4" />
        <Text style={styles.loadingText}>Učitavanje mape Gradačca...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="map" size={28} color="#fff" />
          <Text style={styles.headerTitle}>Gradačac</Text>
        </View>
        <Text style={styles.headerSubtitle}>Mapa Grada</Text>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { backgroundColor: selectedCategory === category.id ? category.color : '#fff' },
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <Ionicons
                name={getCategoryIcon(category.id)}
                size={20}
                color={selectedCategory === category.id ? '#fff' : category.color}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: selectedCategory === category.id ? '#fff' : '#333' },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={GRADACAC_CENTER}
          showsUserLocation={true}
          showsMyLocationButton={false}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        >
          {locations.map((location) => (
            <Marker
              key={location.id}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              onPress={() => handleMarkerPress(location)}
              pinColor={getCategoryColor(location.category)}
            >
              <View style={[styles.markerContainer, { backgroundColor: getCategoryColor(location.category) }]}>
                <Ionicons name={getCategoryIcon(location.category)} size={16} color="#fff" />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapButton} onPress={centerOnUser}>
            <Ionicons name="locate" size={24} color="#4A90A4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={centerOnGradacac}>
            <Ionicons name="home" size={24} color="#4A90A4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Count */}
      <View style={styles.infoBar}>
        <Ionicons name="location" size={18} color="#4A90A4" />
        <Text style={styles.infoText}>
          {locations.length} lokacija{selectedCategory ? ` u kategoriji` : ''}
        </Text>
      </View>

      {/* Location List */}
      <View style={styles.listContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {locations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={styles.locationCard}
              onPress={() => handleMarkerPress(location)}
            >
              <View style={[styles.locationIcon, { backgroundColor: getCategoryColor(location.category) }]}>
                <Ionicons name={getCategoryIcon(location.category)} size={20} color="#fff" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationAddress}>{location.address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Location Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedLocation && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, { backgroundColor: getCategoryColor(selectedLocation.category) }]}>
                    <Ionicons name={getCategoryIcon(selectedLocation.category)} size={28} color="#fff" />
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedLocation.name}</Text>
                
                <View style={styles.modalRow}>
                  <Ionicons name="location" size={18} color="#666" />
                  <Text style={styles.modalText}>{selectedLocation.address}</Text>
                </View>

                {selectedLocation.description && (
                  <View style={styles.modalRow}>
                    <Ionicons name="information-circle" size={18} color="#666" />
                    <Text style={styles.modalText}>{selectedLocation.description}</Text>
                  </View>
                )}

                {selectedLocation.working_hours && (
                  <View style={styles.modalRow}>
                    <Ionicons name="time" size={18} color="#666" />
                    <Text style={styles.modalText}>{selectedLocation.working_hours}</Text>
                  </View>
                )}

                {selectedLocation.phone && (
                  <View style={styles.modalRow}>
                    <Ionicons name="call" size={18} color="#666" />
                    <Text style={styles.modalText}>{selectedLocation.phone}</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  {selectedLocation.phone && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                      onPress={() => callPhone(selectedLocation.phone!)}
                    >
                      <Ionicons name="call" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Pozovi</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#4A90A4' }]}
                    onPress={() => openNavigation(selectedLocation)}
                  >
                    <Ionicons name="navigate" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Navigacija</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4A90A4',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  mapContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  mapButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationAddress: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
