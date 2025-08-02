import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { controlRelay, getRelayStatus } from '../services/api';
import { storeAuthToken, getAuthToken } from '../utils/auth';

interface RelayControlProps {
  deviceId: string;
  authToken: string;
}

const relayLabels = [
  'Relay 1',
  'Relay 2',
  'Relay 3',
  'Relay 4',
];

export const RelayControl: React.FC<RelayControlProps> = ({ deviceId, authToken }) => {
  const [relayStates, setRelayStates] = useState<{
    relay1: 'on' | 'off';
    relay2: 'on' | 'off';
    relay3: 'on' | 'off';
    relay4: 'on' | 'off';
  } | null>(null);
  const [loading, setLoading] = useState<number | null>(null); // relay number loading, or null
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Store auth token and fetch relay status on mount
  useEffect(() => {
    const init = async () => {
      try {
        await storeAuthToken(deviceId, authToken);
        const status = await getRelayStatus(deviceId);
        setRelayStates(status.relays);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch relay status');
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, [deviceId, authToken]);

  const toggleRelay = async (relayNumber: number) => {
    if (!relayStates) return;
    setLoading(relayNumber);
    setError(null);
    try {
      const relayKey = `relay${relayNumber}` as keyof typeof relayStates;
      const newState = relayStates[relayKey] === 'on' ? 'off' : 'on';
      const response = await controlRelay(deviceId, relayNumber, newState);
      setRelayStates(response.relays);
    } catch (err: any) {
      setError(err.message || 'Failed to control relay');
    } finally {
      setLoading(null);
    }
  };

  if (initializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.label}>Loading relay states...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Relay Control</Text>
      {relayStates && relayLabels.map((label, idx) => {
        const relayKey = `relay${idx + 1}` as keyof typeof relayStates;
        return (
          <View key={relayKey} style={styles.relayRow}>
            <Text style={styles.relayLabel}>{label}</Text>
            <TouchableOpacity
              style={[
                styles.button,
                relayStates[relayKey] === 'on' ? styles.buttonOn : styles.buttonOff,
                loading === idx + 1 && styles.buttonDisabled
              ]}
              onPress={() => toggleRelay(idx + 1)}
              disabled={loading === idx + 1}
            >
              {loading === idx + 1 ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {relayStates[relayKey] === 'on' ? 'Turn Off' : 'Turn On'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
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
  relayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  relayLabel: {
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  button: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
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
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 8,
  },
}); 