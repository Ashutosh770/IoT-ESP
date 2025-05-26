import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { controlRelay } from '../services/api';
import { storeAuthToken, getAuthToken } from '../utils/auth';
import { RelayControlResponse } from '../types';

interface RelayControlProps {
  deviceId: string;
  authToken: string;
  initialState?: 'on' | 'off';
}

export const RelayControl: React.FC<RelayControlProps> = ({ deviceId, authToken, initialState = 'off' }) => {
  const [relayState, setRelayState] = useState<'on' | 'off'>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store auth token when component mounts
  useEffect(() => {
    const storeToken = async () => {
      try {
        await storeAuthToken(deviceId, authToken);
        console.log('Auth token stored on mount for device:', deviceId);
      } catch (err) {
        console.error('Error storing auth token on mount:', err);
      }
    };
    storeToken();
  }, [deviceId, authToken]);

  const toggleRelay = async () => {
    try {
      setLoading(true);
      setError(null);
      const newState = relayState === 'on' ? 'off' : 'on';
      
      // Verify auth token before making the API call
      const storedToken = await getAuthToken(deviceId);
      if (!storedToken) {
        // If no stored token, try to store it again
        await storeAuthToken(deviceId, authToken);
      }
      
      console.log('Toggling relay:', { 
        deviceId, 
        newState,
        hasStoredToken: !!storedToken
      });
      
      const response = await controlRelay(deviceId, newState);
      if (response.success) {
        setRelayState(newState);
      } else {
        throw new Error('Failed to control relay');
      }
    } catch (err) {
      console.error('Error toggling relay:', err);
      setError(err instanceof Error ? err.message : 'Failed to control relay');
      // Revert state on error
      setRelayState(relayState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Relay Control</Text>
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
    marginVertical: 10,
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