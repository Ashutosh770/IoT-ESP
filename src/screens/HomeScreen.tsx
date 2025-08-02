import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchLatestData, fetchDevices } from '../services/api';
import type { SensorData } from '../types/sensor';

type RootStackParamList = {
  Devices: undefined;
  SensorDetail: {
    deviceId: string;
    name: string;
    location: string;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [devices, setDevices] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First fetch devices to get the first device ID
      const devicesResponse = await fetchDevices();
      if (!devicesResponse.success || devicesResponse.devices.length === 0) {
        throw new Error('No devices found');
      }

      setDevices(devicesResponse.devices);
      const firstDevice = devicesResponse.devices[0];

      // Then fetch latest data for the first device
      const response = await fetchLatestData(firstDevice.deviceId);
      if (response.success) {
        setLatestData({
          ...response.data,
          deviceId: firstDevice.deviceId
        });
      } else {
        throw new Error('Failed to fetch sensor data');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleViewAllDevices = () => {
    navigation.navigate('Devices');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to IoT-ESP</Text>
          <Text style={styles.subtitle}>Your Smart Home Control Center</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Sensor Data</Text>
            <TouchableOpacity onPress={handleViewAllDevices}>
              <Text style={styles.viewAllButton}>View All Devices</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : latestData ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Device: {devices[0]?.name || 'Unknown'}</Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Temperature:</Text>
                <Text style={styles.dataValue}>{latestData.temperature.toFixed(1)}°C</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Humidity:</Text>
                <Text style={styles.dataValue}>{latestData.humidity.toFixed(1)}%</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Soil Moisture:</Text>
                <Text style={styles.dataValue}>{latestData.soilMoisture !== undefined ? latestData.soilMoisture.toFixed(1) + '%' : '--'}</Text>
              </View>
              <Text style={styles.timestamp}>
                Last updated: {new Date(latestData.timestamp).toLocaleString()}
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText}>No data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
}); 