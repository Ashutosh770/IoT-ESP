import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchDevices, Device } from '../services/api';

type RootStackParamList = {
  Devices: undefined;
  SensorDetail: {
    deviceId: string;
    name: string;
    location: string;
    authToken?: string;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DevicesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [state, setState] = useState({
    devices: [] as Device[],
    error: null as string | null,
    loading: true,
    refreshing: false
  });

  const loadDevices = async (isRefreshing = false) => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: !isRefreshing, 
        refreshing: isRefreshing,
        error: null 
      }));

      console.log('Fetching devices...');
      const response = await fetchDevices();
      console.log('Fetch response:', response);
      
      if (response.success) {
        setState({
          devices: response.devices,
          error: null,
          loading: false,
          refreshing: false
        });
      } else {
        setState({
          devices: [],
          error: 'Failed to fetch devices',
          loading: false,
          refreshing: false
        });
      }
    } catch (error: any) {
      console.error('Error loading devices:', error);
      setState({
        devices: [],
        error: error.message || 'Failed to fetch devices',
        loading: false,
        refreshing: false
      });
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const onRefresh = () => {
    loadDevices(true);
  };

  const formatLastSeen = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleDevicePress = (device: Device) => {
    if (!device.deviceId) {
      console.error('Device has no deviceId:', device);
      return;
    }

    console.log('Navigating to device:', {
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      authToken: device.authToken
    });

    if (!device.authToken) {
      console.error('Device has no auth token:', device);
      return;
    }

    navigation.navigate('SensorDetail', {
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      authToken: device.authToken
    });
  };

  const renderDeviceItem = ({ item }: { item: Device }) => {
    if (!item.deviceId) {
      console.error('Device item has no deviceId:', item);
      return null;
    }

    console.log('Rendering device item:', item);
    return (
      <TouchableOpacity 
        style={styles.deviceItem}
        onPress={() => handleDevicePress(item)}
      >
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceLocation}>{item.location}</Text>
        <Text style={styles.deviceLastSeen}>
          Created: {formatLastSeen(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (state.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadDevices()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Devices ({state.devices.length})</Text>
      <FlatList
        data={state.devices}
        renderItem={renderDeviceItem}
        keyExtractor={item => item.deviceId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={onRefresh}
            colors={['#0000ff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No devices found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  list: {
    padding: 16,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  deviceLastSeen: {
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    backgroundColor: '#0000ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default DevicesScreen; 