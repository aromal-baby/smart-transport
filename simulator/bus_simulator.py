import paho.mqtt.client as mqtt
import json
import time
import random

# Connecting to the broker
# Fix depriciation warning - use callback_api_version
client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)

try:
    client.connect("localhost", 1883, 60)
    print("Connected to mqtt Broker")
except Exception as e:
    print(f"❌ Failed to connect to MQTT broker: {e}")
    print("   Make sure Mosquitto is running:")
    print("   cd E:\\Official\\StartUp Plans\\smart-transport\\backend")
    print("   docker-compose up -d")
    exit(1)

bus_id = "BUS_01"

print(f"🚌 Starting bus simulator for {bus_id}")
print("Publishing data every 5 seconds... (Press CTRL+C to stop)")


try:
    while True:
        # Similuating the bus data
        data = {
            "bus_id": bus_id,
            "latitude": 9.9312 + random.uniform(-0.01, 0.01),
            "longitude": 76.2673 + random.uniform(-0.01, 0.01),
            "speed": random.randint(20, 60),
            "passengers": random.randint(5,40),
            "timestamp": time.time()
        }

        # Publishing to topic
        topic = f"transport/bus/{bus_id}/data"
        client.publish(topic, json.dumps(data))
        print(f'Published: {data}')

        time.sleep(5)   # Sends every 5 seconds

except KeyboardInterrupt:
    print("\n🛑 Stopping bus simulator...")
    client.disconnect()
    print("✅ Disconnected from MQTT broker")