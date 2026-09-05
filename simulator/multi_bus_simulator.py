import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime
import math
import threading
import sys

class MultiBusSimulator:
    def __init__(self, bus_id, route_config, vehicle_type = "BUS", start_delay=0):
        self.bus_id = bus_id
        self.route_config = route_config
        self.vehicle_type = vehicle_type
        self.current_stop_index = 0
        self.is_at_stop = True
        self.passengers = random.randint(5, 40)
        self.start_delay = start_delay
        self.running = True
        
        # MQTT setup
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        try:
            self.client.connect("localhost", 1883, 60)
            print(f"✅ {bus_id} ({vehicle_type}) connected to MQTT broker")
        except Exception as e:
            print(f"❌ {bus_id} failed to connect: {e}")
            self.running = False


    
    def interpolate_position(self, start_stop, end_stop, progress):
        """Calculate position between two stops"""
        lat = start_stop["latitude"] + (end_stop["latitude"] - start_stop["latitude"]) * progress
        lon = start_stop["longitude"] + (end_stop["longitude"] - start_stop["longitude"]) * progress
        return lat, lon
    

    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculating the distance in km"""
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    

    
    def get_speed_for_time(self):
        """Getting speed based on time of day(traffic, crowd, etc..)"""
        hour = datetime.now().hour

        # Metro has consistent speed so..
        if self.vehicle_type == "METRO":
            if 6 <= hour < 9 or 17 <= hour < 20:
                return random.uniform(30, 45)  # Peak hours
            else:
                return random.uniform(35, 50)  # Off-peak
        else:  # BUS
            if 6 <= hour < 9 or 17 <= hour < 20:
                return random.uniform(15, 30)  # Peak hours - slower traffic
            else:
                return random.uniform(25, 50)  # Off-peak
    

    def get_capacity(self):
        """Get vehicle capacity based on type"""
        return 300 if self.vehicle_type == "METRO" else 50
    
    
    def run(self):
        """Main simulation loop"""
        # Initial delay (for staggered start times)
        if self.start_delay > 0:
            print(f"⏳ {self.bus_id} waiting {self.start_delay}s before starting...")
            time.sleep(self.start_delay)
        
        stops = self.route_config["stops"]
        route_name = self.route_config["route_name"]
        route_id = self.route_config["route_id"]
        capacity = self.get_capacity()
        
        vehicle_emoji = "🚇" if self.vehicle_type == "METRO" else "🚌"
        print(f"{vehicle_emoji} {self.bus_id} starting on {route_name}")
        
        while self.running:
            try:
                current_stop = stops[self.current_stop_index]
                next_stop_index = (self.current_stop_index + 1) % len(stops)
                next_stop = stops[next_stop_index]
                
                if self.is_at_stop:
                    # At stop
                    dwell_min, dwell_max = current_stop["dwell_time_seconds"]
                    dwell_time = random.uniform(dwell_min, dwell_max)
                    
                    if self.vehicle_type == "METRO":
                        boarding = random.randint(5, 30)
                        alighting = random.randint(0, min(self.passengers, 25))
                    else: 
                        boarding = random.randint(0, 10)
                        alighting = random.randint(0, min(self.passengers, 8))

                    self.passengers = max(0, min(50, self.passengers + boarding - alighting))

                    occupancy_percent = round((self.passengers / capacity) * 100, 1)
                    
                    data = {
                        "bus_id": self.bus_id,
                        "vehicle_type": self.vehicle_type,
                        "route_id": self.route_config["route_id"],
                        "route_name": route_name,
                        "status": "AT_STOP",
                        "current_stop": current_stop["stop_name"],
                        "stop_id": current_stop["stop_id"],
                        "latitude": current_stop["latitude"],
                        "longitude": current_stop["longitude"],
                        "speed": 0,
                        "passengers": self.passengers,
                        "capacity": capacity,
                        "occupancy_percent": occupancy_percent,
                        "boarding": boarding,
                        "alighting": alighting,
                        "timestamp": time.time()
                    }
                    
                    self.publish_data(data)
                    time.sleep(dwell_time)
                    self.is_at_stop = False
                    
                else:
                    # Moving between stops
                    distance = self.calculate_distance(
                        current_stop["latitude"], current_stop["longitude"],
                        next_stop["latitude"], next_stop["longitude"]
                    )
                    
                    avg_speed = self.get_speed_for_time()

                    # Check if next stop is a via point (no dwell time)
                    is_via_point = next_stop.get("is_via_point", False)

                    # Adjust travel time based on distance
                    travel_time_seconds = (distance / avg_speed) * 3600

                    # More frequent updates for smoother movement (every 2-5 seconds)
                    update_interval = 3 # Seconds b/w updates
                    num_updates = max(3, int(travel_time_seconds / update_interval))
                    
                    for i in range(num_updates):
                        if not self.running:
                            break
                            
                        progress = (i + 1) / num_updates
                        lat, lon = self.interpolate_position(current_stop, next_stop, progress)
                        
                        # Mocking GPS noise
                        noise = 0.00005 if self.vehicle_type == "METRO" else 0.0001
                        lat += random.uniform(-noise, noise)
                        lon += random.uniform(-noise, noise)
                        
                        current_speed = avg_speed * random.uniform(0.85, 1.15)
                        occupancy_percent = round((self.passengers / capacity) * 100, 1)
                        
                        data = {
                            "bus_id": self.bus_id,
                            "vehicle_type": self.vehicle_type,
                            "route_id": route_id,
                            "route_name": route_name,
                            "status": "MOVING",
                            "next_stop": next_stop["stop_name"],
                            "next_stop_id": next_stop["stop_id"],
                            "latitude": lat,
                            "longitude": lon,
                            "speed": round(current_speed, 1),
                            "passengers": self.passengers,
                            "capacity": capacity,
                            "occupancy_percent": occupancy_percent,
                            "timestamp": time.time()
                        }
                        
                        self.publish_data(data)
                        time.sleep(travel_time_seconds / num_updates)
                    
                    self.current_stop_index = next_stop_index

                    # Only stopping at real stops, not via points
                    if is_via_point:
                        self.is_at_stop = False     # Keep moving through via points
                    else:
                        self.is_at_stop = True
                    
            except Exception as e:
                print(f"❌ {self.bus_id} error: {e}")
                break
        
        self.stop()
    
    def publish_data(self, data):
        """Publishing to MQTT"""
        vehicle_topic = "metro" if self.vehicle_type == "METRO" else "bus"
        topic = f"transport/{vehicle_topic}/{self.bus_id}/data"
        self.client.publish(topic, json.dumps(data))
    
    def stop(self):
        """Stoping the simulation"""
        self.running = False
        self.client.disconnect()
        vehicle_emoji = "🚇" if self.vehicle_type == "METRO" else "🚌"
        print(f"🛑 {vehicle_emoji} {self.bus_id} stopped")


def detect_vehicle_type(route_config):
    """Detect if route is for metro or bus based on naming patterns from route_configs"""
    route_name = route_config.get("route_name", "").upper()
    route_id = route_config.get("route_id", "").upper()

    # Checking for metro keywords
    metro_keywords = ["METRO", "KMRL", "RAIL", "TRAIN"]

    for key in metro_keywords:
        if key in route_name or key in route_id:
            return "METRO"
        
     # Check bus IDs - if they start with BUS_KMRL, it's metro
    if route_config.get("buses"):
        first_bus_id = route_config["buses"][0].get("bus_id", "")
        if "KMRL" in first_bus_id.upper():
            return "METRO"
    
    return "BUS"

def load_config(config_path="routes_config.json"):
    """Loading the routes configuration"""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Config file not found: {config_path}")
        print(f"   Make sure the file exists at: {config_path}")
        sys.exit(1)


def main():
    """Running multiple buses simultaneously"""
    print("=" * 70)
    print("🚦 SMART TRANSPORT SIMULATOR - Multi-Vehicle System")
    print("=" * 70)
    
    # Check for config file path argument
    if len(sys.argv) > 1:
        config_path = sys.argv[1]
        print(f"📁 Using config: {config_path}")
    else:
        config_path = "routes_config.json"
        print(f"📁 Using default config: {config_path}")
    
    config = load_config(config_path)
    
    threads = []
    simulators = []
    bus_count = 0
    metro_count = 0 
    
    # Start all vehicles on all routes
    for route in config["routes"]:
        vehicle_type = detect_vehicle_type(route)
        
        vehicle_emoji = "🚇" if vehicle_type == "METRO" else "🚌"
        print(f"\n{vehicle_emoji} Route: {route['route_name']} (Type: {vehicle_type})")
        
        for i, vehicle_info in enumerate(route["buses"]):
            # Stagger start times (e.g., 0s, 60s, 120s)
            start_delay = i * 6  # 6 seconds apart
            
            simulator = MultiBusSimulator(
                bus_id=vehicle_info["bus_id"],
                route_config=route,
                vehicle_type=vehicle_type,
                start_delay=start_delay
            )
            
            if simulator.running:
                simulators.append(simulator)
                thread = threading.Thread(target=simulator.run, daemon=True)
                thread.start()
                threads.append(thread)

                if vehicle_type == "METRO":
                    metro_count += 1
                else:
                    bus_count += 1
                
                print(f"  ✅ Started {vehicle_info['bus_id']} (delay: {start_delay}s)")
    
    print(f"\n🚀 System Status:")
    print(f" 🚌 Buses: {bus_count}")
    print(f" 🚇 Metros: {metro_count}")
    print(f" 📊 Total vehicles: {len(simulators)}")
    print(f"\n   Press CTRL+C to stop all simulations\n")

    try:
        # Keeping the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping all vehicles...")
        for sim in simulators:
            sim.stop()
        print("✅ All vehicle stopped")


if __name__ == "__main__":
    main()