# 📏 Ultrasonic Sensor Integration Guide for Mobile App Frontend

## 🚀 **Overview**
The ESP32 IoT system now includes an HC-SR04 ultrasonic sensor that measures distance in real-time. This guide provides everything needed to integrate distance data into your mobile app frontend.

---

## 📊 **API Changes**

### **Updated Data Structure**
The sensor data API now includes a `distance` field:

```json
{
  "success": true,
  "data": {
    "deviceId": "ESP32_002",
    "temperature": 25.4,
    "humidity": 60.2,
    "soilMoisture": 45,
    "distance": 15.7,        // ← NEW: Distance in centimeters
    "timestamp": "2025-08-13T05:37:07.000Z"
  }
}
```

### **API Endpoints**
All existing endpoints now return distance data:
- `GET /api/data/latest` - Latest sensor reading with distance
- `GET /api/data` - All sensor readings with distance
- `POST /api/data` - ESP32 sends data including distance

---

## 🎨 **Frontend Integration Examples**

### **React Native Example**
```jsx
// State management
const [sensorData, setSensorData] = useState({
  temperature: 0,
  humidity: 0,
  soilMoisture: 0,
  distance: 0,  // ← Add distance state
  timestamp: null
});

// API call
const fetchSensorData = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/data/latest`);
    const result = await response.json();
    
    if (result.success && result.data) {
      setSensorData({
        temperature: result.data.temperature,
        humidity: result.data.humidity,
        soilMoisture: result.data.soilMoisture,
        distance: result.data.distance,  // ← Handle distance data
        timestamp: result.data.timestamp
      });
    }
  } catch (error) {
    console.error('Error fetching sensor data:', error);
  }
};

// UI Component
const DistanceCard = () => (
  <View style={styles.sensorCard}>
    <Text style={styles.sensorTitle}>📏 Distance</Text>
    <Text style={styles.sensorValue}>
      {sensorData.distance?.toFixed(1) || '--'} cm
    </Text>
    <Text style={styles.sensorStatus}>
      {getDistanceStatus(sensorData.distance)}
    </Text>
  </View>
);
```

### **Flutter Example**
```dart
// Data model
class SensorData {
  final double temperature;
  final double humidity;
  final int soilMoisture;
  final double distance;  // ← Add distance field
  final DateTime timestamp;

  SensorData({
    required this.temperature,
    required this.humidity,
    required this.soilMoisture,
    required this.distance,  // ← Include in constructor
    required this.timestamp,
  });

  factory SensorData.fromJson(Map<String, dynamic> json) {
    return SensorData(
      temperature: json['temperature']?.toDouble() ?? 0.0,
      humidity: json['humidity']?.toDouble() ?? 0.0,
      soilMoisture: json['soilMoisture'] ?? 0,
      distance: json['distance']?.toDouble() ?? 0.0,  // ← Parse distance
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

// UI Widget
Widget buildDistanceCard(SensorData data) {
  return Card(
    child: Padding(
      padding: EdgeInsets.all(16.0),
      child: Column(
        children: [
          Row(
            children: [
              Icon(Icons.straighten, size: 24),
              SizedBox(width: 8),
              Text('Distance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          SizedBox(height: 12),
          Text(
            '${data.distance.toStringAsFixed(1)} cm',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.blue),
          ),
          SizedBox(height: 8),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: getDistanceStatusColor(data.distance),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              getDistanceStatus(data.distance),
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    ),
  );
}
```

---

## 🎯 **Distance Status Logic**

### **Status Categories**
```javascript
function getDistanceStatus(distance) {
  if (!distance || distance === 0) return 'No Data';
  if (distance < 5) return 'Very Close';
  if (distance < 15) return 'Close';
  if (distance < 50) return 'Near';
  if (distance < 100) return 'Moderate';
  if (distance < 200) return 'Far';
  return 'Very Far';
}

function getDistanceStatusColor(distance) {
  if (!distance) return '#6c757d';  // Gray
  if (distance < 5) return '#dc3545';   // Red - Very Close
  if (distance < 15) return '#fd7e14';  // Orange - Close  
  if (distance < 50) return '#ffc107';  // Yellow - Near
  if (distance < 100) return '#28a745'; // Green - Moderate
  if (distance < 200) return '#17a2b8'; // Blue - Far
  return '#6f42c1';  // Purple - Very Far
}
```

---

## 📱 **UI Design Suggestions**

### **Distance Card Layout**
```
┌─────────────────────────┐
│ 📏 Distance Sensor      │
│                         │
│      15.7 cm           │
│                         │
│    [Near] Status        │
│                         │
│ Range: 2-400 cm         │
└─────────────────────────┘
```

### **Visual Indicators**
- **Progress Bar:** Show distance as percentage of max range (400cm)
- **Color Coding:** Use colors to indicate proximity levels
- **Icons:** Use ruler/measurement icons for visual appeal
- **Animation:** Smooth transitions when distance values change

---

## 🔧 **Technical Specifications**

### **Sensor Details**
- **Model:** HC-SR04 Ultrasonic Sensor
- **Range:** 2cm - 400cm
- **Accuracy:** ±3mm
- **Update Rate:** Every 2 seconds
- **Resolution:** 0.1cm

### **Data Validation**
```javascript
function validateDistance(distance) {
  return distance >= 2 && distance <= 400;
}

function formatDistance(distance) {
  if (!validateDistance(distance)) return '--';
  return `${distance.toFixed(1)} cm`;
}
```

---

## 🎨 **Styling Examples**

### **CSS/Styling Properties**
```css
.distance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.distance-value {
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  margin: 10px 0;
}

.distance-status {
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 20px;
  text-align: center;
  font-size: 0.9rem;
}
```

---

## 📊 **Chart Integration**

### **Real-time Distance Chart**
```javascript
// Chart.js example for distance over time
const distanceChartConfig = {
  type: 'line',
  data: {
    labels: timestamps,
    datasets: [{
      label: 'Distance (cm)',
      data: distanceValues,
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 400,
        title: {
          display: true,
          text: 'Distance (cm)'
        }
      }
    }
  }
};
```

---

## 🚨 **Error Handling**

### **Common Scenarios**
```javascript
function handleDistanceData(data) {
  // No distance data received
  if (!data.distance) {
    return { value: '--', status: 'No Data', color: '#6c757d' };
  }
  
  // Out of range values
  if (data.distance < 2 || data.distance > 400) {
    return { value: 'Error', status: 'Out of Range', color: '#dc3545' };
  }
  
  // Valid data
  return {
    value: `${data.distance.toFixed(1)} cm`,
    status: getDistanceStatus(data.distance),
    color: getDistanceStatusColor(data.distance)
  };
}
```

---

## 🔄 **Real-time Updates**

### **WebSocket Integration** (Optional)
```javascript
// If you want real-time updates without polling
const ws = new WebSocket('ws://your-server/sensor-stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.distance) {
    updateDistanceDisplay(data.distance);
  }
};
```

---

## 📝 **Testing Checklist**

- [ ] Distance data appears in API responses
- [ ] UI displays distance value correctly
- [ ] Status indicators work for different ranges
- [ ] Error handling for missing/invalid data
- [ ] Real-time updates every 2 seconds
- [ ] Visual feedback for distance changes
- [ ] Responsive design on different screen sizes

---

## 🎯 **Use Cases**

### **Practical Applications**
- **Water Level Monitoring:** Tank/reservoir depth measurement
- **Proximity Detection:** Object detection and avoidance
- **Garden Monitoring:** Plant growth tracking
- **Security:** Motion/presence detection
- **Automation:** Distance-based relay control

---

This integration guide provides everything you need to seamlessly add ultrasonic distance sensing to your mobile app frontend. The sensor data is now available through your existing API endpoints with no breaking changes to your current implementation.
