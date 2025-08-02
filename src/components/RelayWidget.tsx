import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { controlRelay, getRelayStatus } from '../services/api';
import { storeAuthToken, getAuthToken } from '../utils/auth';

interface RelayWidgetProps {
  deviceId: string;
  authToken: string;
  relayNumber: number;
  label: string;
}

export const RelayWidget: React.FC<RelayWidgetProps> = ({ 
  deviceId, 
  authToken, 
  relayNumber,
  label 
}) => {
  const [relayState, setRelayState] = useState<'on' | 'off'>('off');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await storeAuthToken(deviceId, authToken);
        const status = await getRelayStatus(deviceId);
        const relayKey = `relay${relayNumber}` as keyof typeof status.relays;
        setRelayState(status.relays[relayKey]);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch relay status');
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, [deviceId, authToken, relayNumber]);

  const toggleRelay = async () => {
    setLoading(true);
    setError(null);
    try {
      const newState = relayState === 'on' ? 'off' : 'on';
      const response = await controlRelay(deviceId, relayNumber, newState);
      const relayKey = `relay${relayNumber}` as keyof typeof response.relays;
      setRelayState(response.relays[relayKey]);
    } catch (err: any) {
      setError(err.message || 'Failed to control relay');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.button,
          relayState === 'on' ? styles.buttonOn : styles.buttonOff,
          loading && styles.buttonDisabled
        ]}
        onPress={toggleRelay}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {relayState === 'on' ? 'Turn Off' : 'Turn On'}
          </Text>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonOn: {
    backgroundColor: '#4CAF50',
  },
  buttonOff: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 8,
  },
}); 