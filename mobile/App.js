import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'http://localhost:3001/api';

export default function App() {
  const [mode, setMode] = useState('rider'); // 'rider' or 'driver'
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [driverId, setDriverId] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [currentBooking, setCurrentBooking] = useState(null);

  useEffect(() => {
    fetchRides();
    fetchDrivers();
  }, []);

  const fetchRides = async () => {
    try {
      const res = await fetch(`${API_URL}/rides`);
      const data = await res.json();
      setRides(data);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_URL}/drivers`);
      const data = await res.json();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
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
        body: JSON.stringify({ pickup, destination, status: 'pending' }),
      });
      const newRide = await res.json();
      setRides([newRide, ...rides]);
      setCurrentBooking(newRide);
      setPickup('');
      setDestination('');
      Alert.alert('Success', 'Ride booked! Looking for drivers...');
    } catch (error) {
      console.error('Error booking ride:', error);
      Alert.alert('Error', 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const registerDriver = async () => {
    if (!driverName.trim()) {
      Alert.alert('Error', 'Please enter driver name');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: driverName, status: 'available' }),
      });
      const newDriver = await res.json();
      setDrivers([newDriver, ...drivers]);
      setDriverId(newDriver.id);
      setDriverName('');
      Alert.alert('Success', 'Registered as driver!');
    } catch (error) {
      console.error('Error registering driver:', error);
      Alert.alert('Error', 'Failed to register as driver');
    }
  };

  const acceptRide = async (rideId) => {
    if (!driverId) {
      Alert.alert('Error', 'Please register as driver first');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/rides/${rideId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const updatedRide = await res.json();
      setRides(rides.map(ride => ride.id === rideId ? updatedRide : ride));
      Alert.alert('Success', 'Ride accepted!');
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride');
    }
  };

  const completeRide = async (rideId) => {
    try {
      const res = await fetch(`${API_URL}/rides/${rideId}/complete`, {
        method: 'POST',
      });
      const updatedRide = await res.json();
      setRides(rides.map(ride => ride.id === rideId ? updatedRide : ride));
      if (currentBooking && currentBooking.id === rideId) {
        setCurrentBooking(null);
      }
      Alert.alert('Success', 'Ride completed!');
    } catch (error) {
      console.error('Error completing ride:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'completed': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderRiderView = () => (
    <View>
      <Text style={styles.header}>Book a Ride</Text>
      
      {currentBooking && (
        <View style={styles.currentBooking}>
          <Text style={styles.bookingTitle}>Current Booking</Text>
          <Text style={styles.bookingText}>From: {currentBooking.pickup}</Text>
          <Text style={styles.bookingText}>To: {currentBooking.destination}</Text>
          <Text style={[styles.status, { color: getStatusColor(currentBooking.status) }]}>
            Status: {currentBooking.status.toUpperCase()}
          </Text>
          {currentBooking.status === 'accepted' && (
            <TouchableOpacity 
              style={styles.completeBtn} 
              onPress={() => completeRide(currentBooking.id)}
            >
              <Text style={styles.completeBtnText}>Complete Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Pickup location..."
          placeholderTextColor="#666"
          value={pickup}
          onChangeText={setPickup}
        />
        <TextInput
          style={styles.input}
          placeholder="Destination..."
          placeholderTextColor="#666"
          value={destination}
          onChangeText={setDestination}
        />
        <TouchableOpacity style={styles.bookBtn} onPress={bookRide} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>Book Ride</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionTitle}>Recent Rides</Text>
      <FlatList
        data={rides.slice(0, 5)}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.rideItem}>
            <Text style={styles.rideText}>From: {item.pickup}</Text>
            <Text style={styles.rideText}>To: {item.destination}</Text>
            <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No rides yet</Text>}
      />
    </View>
  );

  const renderDriverView = () => (
    <View>
      <Text style={styles.header}>Driver Dashboard</Text>
      
      {!driverId && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your name to register as driver..."
            placeholderTextColor="#666"
            value={driverName}
            onChangeText={setDriverName}
          />
          <TouchableOpacity style={styles.registerBtn} onPress={registerDriver}>
            <Text style={styles.registerBtnText}>Register as Driver</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {driverId && (
        <View style={styles.driverStatus}>
          <Text style={styles.statusText}>Driver ID: {driverId}</Text>
          <Text style={styles.statusText}>Status: Available</Text>
        </View>
      )}
      
      <Text style={styles.sectionTitle}>Available Rides</Text>
      <FlatList
        data={rides.filter(ride => ride.status === 'pending')}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.rideItem}>
            <Text style={styles.rideText}>From: {item.pickup}</Text>
            <Text style={styles.rideText}>To: {item.destination}</Text>
            <Text style={styles.rideText}>Status: {item.status}</Text>
            {driverId && (
              <TouchableOpacity 
                style={styles.acceptBtn} 
                onPress={() => acceptRide(item.id)}
              >
                <Text style={styles.acceptBtnText}>Accept Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending rides</Text>}
      />
      
      <Text style={styles.sectionTitle}>My Accepted Rides</Text>
      <FlatList
        data={rides.filter(ride => ride.driver_id === driverId && ride.status === 'accepted')}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.rideItem}>
            <Text style={styles.rideText}>From: {item.pickup}</Text>
            <Text style={styles.rideText}>To: {item.destination}</Text>
            <TouchableOpacity 
              style={styles.completeBtn} 
              onPress={() => completeRide(item.id)}
            >
              <Text style={styles.completeBtnText}>Complete Ride</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No active rides</Text>}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.modeToggle}>
        <Text style={styles.modeLabel}>Rider</Text>
        <Switch
          value={mode === 'driver'}
          onValueChange={(value) => setMode(value ? 'driver' : 'rider')}
          thumbColor={mode === 'driver' ? '#10b981' : '#3b82f6'}
          trackColor={{ false: '#3b82f6', true: '#10b981' }}
        />
        <Text style={styles.modeLabel}>Driver</Text>
      </View>
      
      {mode === 'rider' ? renderRiderView() : renderDriverView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', paddingTop: 60, paddingHorizontal: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  modeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, gap: 15 },
  modeLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  inputContainer: { marginBottom: 20 },
  input: { backgroundColor: '#1a1a24', borderRadius: 12, padding: 15, color: '#fff', marginBottom: 10 },
  bookBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 15, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 15, alignItems: 'center' },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  acceptBtn: { backgroundColor: '#f59e0b', borderRadius: 8, padding: 10, marginTop: 10 },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  completeBtn: { backgroundColor: '#10b981', borderRadius: 8, padding: 10, marginTop: 10 },
  completeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 15 },
  currentBooking: { backgroundColor: '#1a1a24', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 2, borderColor: '#3b82f6' },
  bookingTitle: { color: '#3b82f6', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  bookingText: { color: '#fff', fontSize: 14, marginBottom: 5 },
  driverStatus: { backgroundColor: '#1a1a24', borderRadius: 12, padding: 15, marginBottom: 20 },
  statusText: { color: '#10b981', fontSize: 14, marginBottom: 5 },
  rideItem: { backgroundColor: '#1a1a24', padding: 15, borderRadius: 12, marginBottom: 10 },
  rideText: { color: '#fff', fontSize: 14, marginBottom: 5 },
  status: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  empty: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 16 },
});