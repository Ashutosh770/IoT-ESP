import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { fetchLatestData, fetchHistoryData } from '../services/api';
import { RelayWidget } from '../components/RelayWidget';
import { storeAuthToken } from '../utils/auth';

// Get screen dimensions
const { width } = Dimensions.get('window');

type RootStackParamList = {
  SensorDetail: {
    deviceId: string;
    name: string;
    location: string;
    authToken?: string;
  };
  ControlPanel: undefined;
};

type SensorDetailRouteProp = RouteProp<RootStackParamList, 'SensorDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Component for data visualization bar
const DataBar = ({ value, maxValue, color, label }: { value: number, maxValue: number, color: string, label: string }) => {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  
  return (
    <View style={styles.barContainer}>
      <View style={styles.barLabelContainer}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value.toFixed(1)}</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

// Temperature Dial Component
const TemperatureDial = ({ temperature, color, max }: { temperature: number, color: string, max: number }) => {
  // Calculate the angle for the temperature (0-50°C maps to -135° to 135°)
  const getTemperatureColor = (temp: number) => {
    if (temp < 10) return '#4dabf7'; // cold - blue
    if (temp < 20) return '#51cf66'; // cool - green
    if (temp < 30) return '#fcc419'; // warm - yellow
    return '#ff6b6b';  // hot - red
  };

  // Convert temperature to angle (0-50°C maps to -135° to 135°)
  const tempAngle = -135 + (temperature / max) * 270;

  // Generate the arc path for the dial (left to right)
  const generateArc = (radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(radius, startAngle);
    const end = polarToCartesian(radius, endAngle);
    const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Convert polar coordinates to cartesian
  const polarToCartesian = (radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: 100 + (radius * Math.cos(angleInRadians)),
      y: 100 + (radius * Math.sin(angleInRadians))
    };
  };

  // Generate tick marks (left to right)
  const generateTicks = () => {
    const ticks = [];
    const radius = 80;
    const tickLength = 10;

    for (let angle = -135; angle <= 135; angle += 15) {
      const outer = polarToCartesian(radius, angle);
      const inner = polarToCartesian(radius - tickLength, angle);

      // Determine color based on position
      let tickColor;
      if (angle < -90) tickColor = '#4dabf7'; // blue
      else if (angle < 0) tickColor = '#51cf66'; // green
      else if (angle < 90) tickColor = '#fcc419'; // yellow
      else tickColor = '#ff6b6b'; // red

      ticks.push(
        <Path
          key={`tick-${angle}`}
          d={`M ${outer.x} ${outer.y} L ${inner.x} ${inner.y}`}
          stroke={tickColor}
          strokeWidth="2"
        />
      );
    }
    return ticks;
  };

  // Calculate needle position
  const needlePoint = polarToCartesian(60, tempAngle);

  // Calculate min/max label positions (left: 0, right: max)
  const r = 85;
  const center = 100;
  const labelRadius = r + 18;
  // Use -135° for min (0), 135° for max
  const minAngleDeg = -135;
  const maxAngleDeg = 135;
  const minAngleRad = (minAngleDeg - 90) * Math.PI / 180;
  const maxAngleRad = (maxAngleDeg - 90) * Math.PI / 180;
  const minX = center + labelRadius * Math.cos(minAngleRad);
  const minY = center + labelRadius * Math.sin(minAngleRad);
  const maxX = center + labelRadius * Math.cos(maxAngleRad);
  const maxY = center + labelRadius * Math.sin(maxAngleRad);

  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Background Circle */}
      <Circle cx="100" cy="100" r="85" fill="#f8f9fb" stroke="#e9ecef" strokeWidth="2" />

      {/* Colored Arc */}
      <Path
        d={generateArc(80, -135, 135)}
        stroke="#e9ecef"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tick Marks */}
      <G>
        {generateTicks()}
      </G>

      {/* Min/Max labels (left: 0, right: max) */}
      <SvgText
        x={minX}
        y={minY}
        fontSize="14"
        fill="#888"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        0
      </SvgText>
      <SvgText
        x={maxX}
        y={maxY}
        fontSize="14"
        fill="#888"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {max}
      </SvgText>

      {/* Value in center, but higher up */}
      <G>
        <SvgText
          x="100"
          y="70"
          fontSize="28"
          fontWeight="bold"
          fill="#4a5568"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {temperature.toFixed(1)}
        </SvgText>
      </G>
      {/* Needle (drawn after value so it's above) */}
      <G>
        <Path
          d={`M100 100 L${needlePoint.x} ${needlePoint.y}`}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Circle cx="100" cy="100" r="8" fill={getTemperatureColor(temperature)} />
      </G>
    </Svg>
  );
};

// Update gauge usages to wrap with a label below
const GaugeWithLabel = ({ value, color, max, label }: { value: number, color: string, max: number, label: string }) => (
  <View style={styles.gaugeWrapper}>
    <TemperatureDial temperature={value} color={color} max={max} />
    <Text style={styles.gaugeLabel}>{label}</Text>
  </View>
);

// Update HumidityDial and SoilMoistureDial to use GaugeWithLabel
const HumidityDial = ({ humidity }: { humidity: number }) => (
  <GaugeWithLabel value={humidity} color="#4dabf7" max={100} label="Humidity" />
);
const SoilMoistureDial = ({ soilMoisture }: { soilMoisture: number }) => (
  <GaugeWithLabel value={soilMoisture} color="#8bc34a" max={100} label="Soil Moisture" />
);

// Distance status helper functions
const getDistanceStatus = (distance: number): string => {
  if (!distance || distance === 0) return 'No Data';
  if (distance < 5) return 'Very Close';
  if (distance < 15) return 'Close';
  if (distance < 50) return 'Near';
  if (distance < 100) return 'Moderate';
  if (distance < 200) return 'Far';
  return 'Very Far';
};

const getDistanceStatusColor = (distance: number): string => {
  if (!distance) return '#6c757d';  // Gray
  if (distance < 5) return '#dc3545';   // Red - Very Close
  if (distance < 15) return '#fd7e14';  // Orange - Close  
  if (distance < 50) return '#ffc107';  // Yellow - Near
  if (distance < 100) return '#28a745'; // Green - Moderate
  if (distance < 200) return '#17a2b8'; // Blue - Far
  return '#6f42c1';  // Purple - Very Far
};

// Distance Card Component
const DistanceCard = ({ distance }: { distance: number }) => {
  const status = getDistanceStatus(distance);
  const statusColor = getDistanceStatusColor(distance);
  const percentage = Math.min(Math.max((distance / 400) * 100, 0), 100); // Max range 400cm
  
  return (
    <View style={styles.distanceCard}>
      <View style={styles.distanceHeader}>
        <Text style={styles.distanceIcon}>📏</Text>
        <Text style={styles.distanceTitle}>Distance Sensor</Text>
      </View>
      
      <Text style={styles.distanceValue}>
        {distance ? `${distance.toFixed(1)} cm` : '--'}
      </Text>
      
      <View style={[styles.distanceStatus, { backgroundColor: statusColor }]}>
        <Text style={styles.distanceStatusText}>{status}</Text>
      </View>
      
      <View style={styles.distanceProgressContainer}>
        <View style={styles.distanceProgressBackground}>
          <View 
            style={[
              styles.distanceProgressFill, 
              { width: `${percentage}%`, backgroundColor: statusColor }
            ]} 
          />
        </View>
        <Text style={styles.distanceRange}>Range: 2-400 cm</Text>
      </View>
    </View>
  );
};

// Hamburger Icon Component
const HamburgerIcon = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.hamburgerButton} onPress={onPress}>
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
  </TouchableOpacity>
);

// Widget Configuration Type
type WidgetConfig = {
  id: string;
  title: string;
  enabled: boolean;
  component: 'gauge' | 'humidityGauge' | 'soilGauge' | 'cards' | 'bars' | 'soil' | 'distance' | 'relay1' | 'relay2' | 'relay3' | 'relay4';
};

const SensorDetailScreen = () => {
  const route = useRoute<SensorDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { deviceId, name, location } = route.params;

  console.log('SensorDetailScreen mounted with params:', { deviceId, name, location });

  // Validate route params
  if (!deviceId) {
    console.error('No deviceId provided in route params');
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid device ID</Text>
      </View>
    );
  }

  const [sensorData, setSensorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  
  // Widget configurations
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: '1', title: 'Temperature Gauge', enabled: true, component: 'gauge' },
    { id: 'humidityGauge', title: 'Humidity Gauge', enabled: true, component: 'humidityGauge' },
    { id: 'soilGauge', title: 'Soil Moisture Gauge', enabled: true, component: 'soilGauge' },
    { id: '2', title: 'Temperature & Humidity Cards', enabled: true, component: 'cards' },
    { id: '3', title: 'Data Visualization Bars', enabled: true, component: 'bars' },
    { id: 'soil', title: 'Soil Moisture', enabled: true, component: 'soil' },
    { id: 'distance', title: 'Distance Sensor', enabled: true, component: 'distance' },
    { id: 'relay1', title: 'Relay 1', enabled: true, component: 'relay1' },
    { id: 'relay2', title: 'Relay 2', enabled: true, component: 'relay2' },
    { id: 'relay3', title: 'Relay 3', enabled: true, component: 'relay3' },
    { id: 'relay4', title: 'Relay 4', enabled: true, component: 'relay4' },
  ]);

  // Animation value for menu
  const slideAnim = useRef(new Animated.Value(-width)).current;

  const loadData = async (showSpinner = false) => {
    if (!deviceId) {
      console.error('No device ID available for loading data');
      return;
    }
    if (showSpinner) setLoading(true);
    try {
      if (route.params.authToken) {
        await storeAuthToken(deviceId, route.params.authToken);
      }
      const result = await fetchLatestData(deviceId);
      if (result.success) {
        setSensorData(result.data);
        setLastUpdated(new Date());
      }
      const history = await fetchHistoryData(deviceId);
      if (history.success && history.data.length > 0) {
        setHistoryData(history.data);
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  useEffect(() => {
    if (deviceId) {
      loadData(true); // Initial load with spinner
      const interval = setInterval(() => loadData(false), 3000); // Silent refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [deviceId]);

  // For debugging
  useEffect(() => {
    console.log("Sensor data updated:", sensorData);
  }, [sensorData]);

  // Toggle menu visibility
  const toggleMenu = () => {
    if (menuVisible) {
      // Hide menu
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      // Show menu
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Toggle widget visibility
  const toggleWidget = (id: string) => {
    setWidgets(
      widgets.map(widget => 
        widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
      )
    );
  };

  // Check if a component should be shown
  const shouldShowComponent = (component: 'gauge' | 'humidityGauge' | 'soilGauge' | 'cards' | 'bars' | 'soil' | 'distance' | 'relay1' | 'relay2' | 'relay3' | 'relay4') => {
    return widgets.some(widget => widget.component === component && widget.enabled);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Main Content */}
      <View style={styles.mainContainer}>
        <View style={styles.headerRow}>
          <HamburgerIcon onPress={toggleMenu} />
          <Text style={styles.title}>{name}</Text>
          {sensorData ? (
            <Text style={styles.statusOnline}>Online</Text>
          ) : (
            <Text style={styles.statusOffline}>Offline</Text>
          )}
        </View>

        <ScrollView 
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading sensor data...</Text>
            </View>
          ) : (
            <>
              {/* Temperature Dial */}
              {sensorData && shouldShowComponent('gauge') && (
                <View style={styles.dialWrapper}>
                  <GaugeWithLabel value={parseFloat(sensorData.temperature) || 0} color="#ff6b6b" max={50} label="Temperature" />
                </View>
              )}
              {sensorData && shouldShowComponent('humidityGauge') && (
                <View style={styles.dialWrapper}>
                  <HumidityDial humidity={parseFloat(sensorData.humidity) || 0} />
                </View>
              )}
              {sensorData && shouldShowComponent('soilGauge') && (
                <View style={styles.dialWrapper}>
                  <SoilMoistureDial soilMoisture={parseFloat(sensorData.soilMoisture) || 0} />
                </View>
              )}
            
              {/* Temperature and Humidity Cards */}
              {shouldShowComponent('cards') && (
                <>
                  <View style={styles.rowCard}>
                    <View style={styles.cardHalf}>
                      <Text style={styles.label}>Temperature</Text>
                      <Text style={styles.value}>{sensorData?.temperature ?? '--'}°C</Text>
                    </View>
                    <View style={styles.cardHalf}>
                      <Text style={styles.label}>Humidity</Text>
                      <Text style={styles.value}>{sensorData?.humidity ?? '--'}%</Text>
                    </View>
                  </View>
                  {shouldShowComponent('soil') && (
                    <View style={styles.singleCard}>
                      <Text style={styles.label}>Soil Moisture</Text>
                      <Text style={styles.value}>{sensorData?.soilMoisture ?? '--'}%</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
          
          {/* Data visualization bars */}
          {sensorData && !loading && shouldShowComponent('bars') && (
            <View style={styles.barsContainer}>
              <DataBar 
                value={parseFloat(sensorData.temperature) || 0} 
                maxValue={50} 
                color="#ff6b6b" 
                label="Temperature (°C)" 
              />
              <DataBar 
                value={parseFloat(sensorData.humidity) || 0} 
                maxValue={100} 
                color="#4dabf7" 
                label="Humidity (%)" 
              />
              <DataBar 
                value={parseFloat(sensorData.soilMoisture) || 0} 
                maxValue={100} 
                color="#8bc34a" 
                label="Soil Moisture (%)" 
              />
              {sensorData.distance !== undefined && (
                <DataBar 
                  value={parseFloat(sensorData.distance) || 0} 
                  maxValue={400} 
                  color={getDistanceStatusColor(parseFloat(sensorData.distance) || 0)} 
                  label="Distance (cm)" 
                />
              )}
            </View>
          )}
          
          {/* Distance Card */}
          {sensorData && !loading && shouldShowComponent('distance') && (
            <DistanceCard distance={parseFloat(sensorData.distance) || 0} />
          )}
          
          <View style={styles.historyHeader}>
            <Text style={styles.subtitle}>Device Info</Text>
            <Text style={styles.autoRefresh}>Auto-refresh: 3s</Text>
          </View>
          
          <View style={styles.historyBox}>
            {sensorData ? (
              <View style={styles.dataInfo}>
                <Text style={styles.deviceId}>Device ID: {deviceId}</Text>
                <Text style={styles.timestamp}>Last updated: {lastUpdated?.toLocaleTimeString()}</Text>
                <Text style={styles.timestamp}>Soil Moisture: {sensorData.soilMoisture ?? '--'}%</Text>
              </View>
            ) : (
              <Text style={{color:'#bbb'}}>No data available</Text>
            )}
          </View>
          
          {/* Add Relay Control */}
          {shouldShowComponent('relay1') && (
            <RelayWidget
              deviceId={deviceId}
              authToken={route.params.authToken || 'ec0d7c50f303ef0af51928bd681f246f1d2cd53c5e9db7ac8afc4713380f660b'}
              relayNumber={1}
              label="Relay 1"
            />
          )}

          {shouldShowComponent('relay2') && (
            <RelayWidget
              deviceId={deviceId}
              authToken={route.params.authToken || 'ec0d7c50f303ef0af51928bd681f246f1d2cd53c5e9db7ac8afc4713380f660b'}
              relayNumber={2}
              label="Relay 2"
            />
          )}

          {shouldShowComponent('relay3') && (
            <RelayWidget
              deviceId={deviceId}
              authToken={route.params.authToken || 'ec0d7c50f303ef0af51928bd681f246f1d2cd53c5e9db7ac8afc4713380f660b'}
              relayNumber={3}
              label="Relay 3"
            />
          )}

          {shouldShowComponent('relay4') && (
            <RelayWidget
              deviceId={deviceId}
              authToken={route.params.authToken || 'ec0d7c50f303ef0af51928bd681f246f1d2cd53c5e9db7ac8afc4713380f660b'}
              relayNumber={4}
              label="Relay 4"
            />
          )}
          
          <TouchableOpacity style={styles.controlBtn} onPress={() => navigation.navigate('ControlPanel')}>
            <Text style={styles.controlBtnText}>Go to Control Panel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Slide-in Menu */}
      {menuVisible && (
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.sideMenu,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Widget Settings</Text>
              <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={widgets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  <Switch
                    value={item.enabled}
                    onValueChange={() => toggleWidget(item.id)}
                    trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
                    thumbColor={item.enabled ? '#3b82f6' : '#f4f3f4'}
                  />
                </View>
              )}
              contentContainerStyle={styles.menuList}
            />
            
            <View style={styles.menuFooter}>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={toggleMenu}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  mainContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fb',
    padding: 16,
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  statusOnline: { color: '#22c55e', fontWeight: 'bold' },
  statusOffline: { color: '#ef4444', fontWeight: 'bold' },
  battery: { color: '#888', fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 4, alignItems: 'center' },
  label: { color: '#888', fontSize: 14 },
  value: { fontWeight: 'bold', fontSize: 16 },
  subtitle: { fontWeight: 'bold', fontSize: 16 },
  autoRefresh: { color: '#bbb', fontSize: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  historyBox: { backgroundColor: '#fff', borderRadius: 12, minHeight: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20, padding: 12 },
  controlBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 12, alignItems: 'center' },
  controlBtnText: { color: '#fff', fontWeight: 'bold' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#666' },
  dataInfo: { width: '100%' },
  deviceId: { fontSize: 14, color: '#666' },
  timestamp: { fontSize: 12, color: '#888', marginTop: 4 },
  // Bar styles
  barsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  barContainer: {
    marginBottom: 12,
  },
  barLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Dial styles
  dialWrapper: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  gaugeWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeLabel: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Distance Card styles
  distanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  distanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  distanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 8,
  },
  distanceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  distanceStatusText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  distanceProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  distanceProgressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  distanceProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  distanceRange: {
    fontSize: 12,
    color: '#666',
  },
  // Hamburger menu styles
  hamburgerButton: {
    width: 24,
    height: 24,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#4b5563',
  },
  menuList: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    fontSize: 16,
    color: '#4b5563',
  },
  menuFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  relayControlContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  singleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHalf: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
});

export default SensorDetailScreen; 