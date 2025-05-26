import mqtt from 'mqtt';

// Replace with your MQTT broker details
const MQTT_URL = 'mqtt://localhost:1883'; 

const client = mqtt.connect(MQTT_URL);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  // Subscribe to topics here
  // client.subscribe('your/topic', (err) => {
  //   if (!err) {
  //     console.log('Subscribed to your/topic');
  //   }
  // });
});

client.on('message', (topic, message) => {
  // message is Buffer
  console.log(`Received message on topic ${topic}: ${message.toString()}`);
  // Handle incoming messages here
});

client.on('error', (err) => {
  console.error('MQTT client error:', err);
});

export const publishMqttMessage = (topic: string, message: string) => {
  client.publish(topic, message, (err) => {
    if (err) {
      console.error(`Failed to publish message to topic ${topic}:`, err);
    } else {
      console.log(`Message published to topic ${topic}`);
    }
  });
};

// Add other MQTT functions as needed (e.g., subscribe, unsubscribe)

export default client; 