import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { fetchLatestData, fetchHistoryData, SensorData } from '../services/api';

type RootStackParamList = {
  SensorDetail: {
    deviceId: string;
    name: string;
    location: string;
  };
};

type SensorDetailRouteProp = RouteProp<RootStackParamList, 'SensorDetail'>;

const SensorDetail = () => {
  const route = useRoute<SensorDetailRouteProp>();
  const { deviceId, name, location } = route.params;

  console.log('SensorDetail mounted with params:', { deviceId, name, location });

  // Validate route params
  if (!deviceId) {
    console.error('No deviceId provided in route params');
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid device ID</Text>
      </View>
    );
  }

  const [state, setState] = useState({
    currentData: null as SensorData | null,
    historyData: [] as SensorData[],
    loading: true,
    error: null as string | null,
  });

  const loadData = async () => {
    console.log('loadData called with deviceId:', deviceId);
    
    if (!deviceId) {
      console.error('Invalid device ID in loadData:', deviceId);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Invalid device ID'
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      console.log('Loading data for device:', deviceId);
      const [latestResponse, historyResponse] = await Promise.all([
        fetchLatestData(deviceId),
        fetchHistoryData(deviceId)
      ]);

      console.log('API responses:', {
        latest: latestResponse,
        history: historyResponse
      });

      if (!latestResponse.success || !historyResponse.success) {
        throw new Error('Failed to fetch sensor data');
      }

      setState({
        currentData: latestResponse.data,
        historyData: historyResponse.data,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error loading sensor data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load sensor data'
      }));
    }
  };

  useEffect(() => {
    if (deviceId) {
      console.log('Starting data load for device:', deviceId);
      loadData();
      const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
      return () => {
        console.log('Cleaning up interval for device:', deviceId);
        clearInterval(interval);
      };
    }
  }, [deviceId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (state.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading sensor data...</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.location}>{location}</Text>
      </View>

      {state.currentData && (
        <View style={styles.currentData}>
          <Text style={styles.sectionTitle}>Current Readings</Text>
          <View style={styles.readingsContainer}>
            <View style={styles.reading}>
              <Text style={styles.readingValue}>{state.currentData.temperature}°C</Text>
              <Text style={styles.readingLabel}>Temperature</Text>
            </View>
            <View style={styles.reading}>
              <Text style={styles.readingValue}>{state.currentData.humidity}%</Text>
              <Text style={styles.readingLabel}>Humidity</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            Last updated: {formatTimestamp(state.currentData.timestamp)}
          </Text>
        </View>
      )}

      <View style={styles.history}>
        <Text style={styles.sectionTitle}>Recent History</Text>
        {state.historyData.map((reading, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyReadings}>
              <Text style={styles.historyValue}>{reading.temperature}°C</Text>
              <Text style={styles.historyValue}>{reading.humidity}%</Text>
            </View>
            <Text style={styles.historyTimestamp}>
              {formatTimestamp(reading.timestamp)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  location: {
    fontSize: 16,
    color: '#666',
  },
  currentData: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  readingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  reading: {
    alignItems: 'center',
  },
  readingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0000ff',
  },
  readingLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  history: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyReadings: {
    flexDirection: 'row',
    gap: 16,
  },
  historyValue: {
    fontSize: 16,
    color: '#333',
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
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
});

export default SensorDetail; 