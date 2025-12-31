import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:3001/api';

const GrabCloneApp = () => {
  const [mode, setMode] = useState('rider');
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [driverName, setDriverName] = useState('');
  const [hotelData, setHotelData] = useState({
    name: '',
    location: '',
    price_per_night: '',
    rating: '4.0',
    amenities: '',
    description: '',
    available_rooms: '10'
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    fetchData();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseGeocode[0]) {
          const address = `${reverseGeocode[0].street || ''} ${reverseGeocode[0].city || ''}`;
          setPickup(address.trim());
        }
      }
    } catch (error) {
      console.warn('Location error:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ridesRes, driversRes, hotelsRes] = await Promise.all([
        fetch(`${API_URL}/rides`),
        fetch(`${API_URL}/drivers`),
        fetch(`${API_URL}/hotels`)
      ]);
      
      const [ridesData, driversData, hotelsData] = await Promise.all([
        ridesRes.json(),
        driversRes.json(),
        hotelsRes.json()
      ]);
      
      setRides(ridesData);
      setDrivers(driversData);
      setHotels(hotelsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const bookRide = async () => {
    if (!pickup.trim() || !destination.trim()) {
      Alert.alert('Error', 'Please enter pickup and destination');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: pickup.trim(), destination: destination.trim() }),
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Ride booked successfully!');
        setPickup('');
        setDestination('');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to book ride');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const acceptRide = async (rideId) => {
    if (drivers.length === 0) {
      Alert.alert('Error', 'No drivers available');
      return;
    }

    setLoading(true);
    try {
      const availableDriver = drivers.find(d => d.status === 'available');
      if (!availableDriver) {
        Alert.alert('Error', 'No available drivers');
        return;
      }

      const res = await fetch(`${API_URL}/rides/${rideId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: availableDriver.id }),
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Ride accepted!');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to accept ride');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const completeRide = async (rideId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rides/${rideId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Ride completed!');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to complete ride');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const addDriver = async () => {
    if (!driverName.trim()) {
      Alert.alert('Error', 'Please enter driver name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: driverName.trim() }),
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Driver added successfully!');
        setDriverName('');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to add driver');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const addHotel = async () => {
    if (!hotelData.name.trim() || !hotelData.location.trim() || !hotelData.price_per_night) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/hotels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...hotelData,
          price_per_night: parseFloat(hotelData.price_per_night),
          rating: parseFloat(hotelData.rating),
          available_rooms: parseInt(hotelData.available_rooms)
        }),
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Hotel added successfully!');
        setHotelData({
          name: '',
          location: '',
          price_per_night: '',
          rating: '4.0',
          amenities: '',
          description: '',
          available_rooms: '10'
        });
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to add hotel');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const bookHotel = async (hotelId) => {
    Alert.alert(
      'Book Hotel',
      'How many nights would you like to stay?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book 1 Night',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${API_URL}/hotels/${hotelId}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nights: 1 }),
              });
              
              if (res.ok) {
                const data = await res.json();
                Alert.alert('Success', `Hotel booked! Total cost: $${data.booking.total_cost}`);
                fetchData();
              } else {
                const error = await res.json();
                Alert.alert('Error', error.error || 'Failed to book hotel');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const deleteHotel = async (hotelId) => {
    Alert.alert(
      'Delete Hotel',
      'Are you sure you want to delete this hotel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${API_URL}/hotels/${hotelId}`, {
                method: 'DELETE',
              });
              
              if (res.ok) {
                Alert.alert('Success', 'Hotel deleted successfully!');
                fetchData();
              } else {
                Alert.alert('Error', 'Failed to delete hotel');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderRideCard = ({ item }) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'pending' ? '#ff6b35' : item.status === 'accepted' ? '#4285f4' : '#34a853' }
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.rideId}>#{item.id}</Text>
        </View>
        
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#4285f4' }]} />
            <Text style={styles.routeText}>{item.pickup}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#34a853' }]} />
            <Text style={styles.routeText}>{item.destination}</Text>
          </View>
        </View>

        {mode === 'driver' && item.status === 'pending' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => acceptRide(item.id)}
          >
            <LinearGradient
              colors={['#4285f4', '#34a853']}
              style={styles.buttonGradient}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.buttonText}>Accept Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {mode === 'driver' && item.status === 'accepted' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => completeRide(item.id)}
          >
            <LinearGradient
              colors={['#34a853', '#0f9d58']}
              style={styles.buttonGradient}
            >
              <Ionicons name="flag" size={20} color="white" />
              <Text style={styles.buttonText}>Complete</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderDriverCard = ({ item }) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.cardGradient}
      >
        <View style={styles.driverHeader}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={24} color="#4285f4" />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{item.name}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: item.status === 'available' ? '#34a853' : '#ff6b35' }
              ]} />
              <Text style={styles.statusLabel}>{item.status}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderHotelCard = ({ item }) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.cardGradient}
      >
        <View style={styles.hotelHeader}>
          <View style={styles.hotelIcon}>
            <Ionicons name="business" size={24} color="#4285f4" />
          </View>
          <View style={styles.hotelInfo}>
            <Text style={styles.hotelName}>{item.name}</Text>
            <Text style={styles.hotelLocation}>
              <Ionicons name="location-outline" size={16} color="#666" />
              {item.location}
            </Text>
          </View>
        </View>

        <View style={styles.hotelDetails}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${item.price_per_night}</Text>
            <Text style={styles.perNight}>per night</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#ffc107" />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
          <Text style={styles.roomsAvailable}>
            {item.available_rooms} rooms available
          </Text>
        </View>

        {item.description && (
          <Text style={styles.hotelDescription}>{item.description}</Text>
        )}

        {item.amenities && (
          <Text style={styles.amenities}>
            <Ionicons name="checkmark-circle" size={16} color="#34a853" />
            {item.amenities}
          </Text>
        )}

        <View style={styles.hotelActions}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => bookHotel(item.id)}
            disabled={item.available_rooms <= 0}
          >
            <LinearGradient
              colors={item.available_rooms > 0 ? ['#4285f4', '#34a853'] : ['#ccc', '#999']}
              style={styles.buttonGradient}
            >
              <Ionicons name="calendar" size={20} color="white" />
              <Text style={styles.buttonText}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteHotel(item.id)}
          >
            <Ionicons name="trash" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderTabButton = (tabMode, icon, label) => (
    <TouchableOpacity
      style={[styles.tabButton, mode === tabMode && styles.activeTab]}
      onPress={() => setMode(tabMode)}
    >
      <LinearGradient
        colors={mode === tabMode ? ['#4285f4', '#34a853'] : ['transparent', 'transparent']}
        style={styles.tabGradient}
      >
        <Ionicons
          name={icon}
          size={24}
          color={mode === tabMode ? 'white' : '#666'}
        />
        <Text style={[
          styles.tabText,
          { color: mode === tabMode ? 'white' : '#666' }
        ]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animated.View style={{
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim
        }}>
          <Text style={styles.headerTitle}>GrabClone</Text>
          <Text style={styles.headerSubtitle}>Your ride, your way</Text>
        </Animated.View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        {renderTabButton('rider', 'car', 'Rider')}
        {renderTabButton('driver', 'person', 'Driver')}
        {renderTabButton('hotels', 'business', 'Hotels')}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4285f4" />
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'rider' && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.formCard}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.formGradient}
              >
                <Text style={styles.formTitle}>
                  <Ionicons name="location" size={20} color="#4285f4" />
                  Book a Ride
                </Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="radio-button-on" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Pickup location"
                    value={pickup}
                    onChangeText={setPickup}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="location" size={20} color="#34a853" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Destination"
                    value={destination}
                    onChangeText={setDestination}
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={bookRide}>
                  <LinearGradient
                    colors={['#4285f4', '#34a853']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="car" size={20} color="white" />
                    <Text style={styles.buttonText}>Book Ride</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>Your Rides</Text>
            <FlatList
              data={rides}
              renderItem={renderRideCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}

        {mode === 'driver' && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.formCard}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.formGradient}
              >
                <Text style={styles.formTitle}>
                  <Ionicons name="person-add" size={20} color="#4285f4" />
                  Add Driver
                </Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Driver name"
                    value={driverName}
                    onChangeText={setDriverName}
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={addDriver}>
                  <LinearGradient
                    colors={['#4285f4', '#34a853']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.buttonText}>Add Driver</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>Available Rides</Text>
            <FlatList
              data={rides.filter(ride => ['pending', 'accepted'].includes(ride.status))}
              renderItem={renderRideCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />

            <Text style={styles.sectionTitle}>Drivers</Text>
            <FlatList
              data={drivers}
              renderItem={renderDriverCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}

        {mode === 'hotels' && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.formCard}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.formGradient}
              >
                <Text style={styles.formTitle}>
                  <Ionicons name="business" size={20} color="#4285f4" />
                  Add Hotel
                </Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="business" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Hotel name"
                    value={hotelData.name}
                    onChangeText={(text) => setHotelData({...hotelData, name: text})}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Location"
                    value={hotelData.location}
                    onChangeText={(text) => setHotelData({...hotelData, location: text})}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="cash" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Price per night"
                    value={hotelData.price_per_night}
                    onChangeText={(text) => setHotelData({...hotelData, price_per_night: text})}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="star" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Rating (1-5)"
                    value={hotelData.rating}
                    onChangeText={(text) => setHotelData({...hotelData, rating: text})}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Amenities (e.g., WiFi, Pool, Gym)"
                    value={hotelData.amenities}
                    onChangeText={(text) => setHotelData({...hotelData, amenities: text})}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="document-text" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Description"
                    value={hotelData.description}
                    onChangeText={(text) => setHotelData({...hotelData, description: text})}
                    multiline
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="bed" size={20} color="#4285f4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Available rooms"
                    value={hotelData.available_rooms}
                    onChangeText={(text) => setHotelData({...hotelData, available_rooms: text})}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={addHotel}>
                  <LinearGradient
                    colors={['#4285f4', '#34a853']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.buttonText}>Add Hotel</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>Available Hotels</Text>
            <FlatList
              data={hotels}
              renderItem={renderHotelCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 15,
    padding: 5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    elevation: 5,
    shadowColor: '#4285f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  formCard: {
    marginVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  formGradient: {
    padding: 25,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#4285f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 15,
    marginLeft: 5,
  },
  card: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  rideId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  routeContainer: {
    marginVertical: 15,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 15,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 5,
    marginVertical: 5,
  },
  routeText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  hotelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  hotelIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  hotelLocation: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotelDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceContainer: {
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285f4',
  },
  perNight: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
  },
  roomsAvailable: {
    fontSize: 14,
    color: '#666',
  },
  hotelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  amenities: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotelActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffebee',
  },
  bottomPadding: {
    height: 30,
  },
});

export default GrabCloneApp;