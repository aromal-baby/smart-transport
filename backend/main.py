from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime
from typing import Dict, List
import asyncio
import threading


app = FastAPI(title="Smart Transport API", version="1.0.0")

# CORS - To allow the frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],    # In production, specify the frontend URL
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)


# In-memory storage for bus data
bus_data: Dict[str, dict] = {}
metro_data: Dict[str, dict] = {}
all_vehicles: Dict[str, dict] = {}  # Combined view

vehicle_history: Dict[str, List[dict]] = {}

# Establishing websocket for real-time updates
websocket_connections: List[WebSocket] = []

# MQTT client setup
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)


def on_connect(client, userdata, flags, rc, properties=None):
    """MQTT connection callback"""
    if rc == 0:
        print("✅ Connected to MQTT broker")
         # Subscribe to both bus and metro topics
        client.subscribe("transport/bus/+/data")
        client.subscribe("transport/metro/+/data")
        print("📡 Subscribed to: transport/bus/+/data")
        print("📡 Subscribed to: transport/metro/+/data")
    else:
        print(f"❌ Failed to connect to MQTT broker, return code: {rc}")


def on_message(client, userdata, msg):
    """MQTT Message callback"""
    try:
        data = json.loads(msg.payload.decode())
        vehicle_id = data.get("bus_id")  # Keep as bus_id for compatibility
        vehicle_type = data.get("vehicle_type", "BUS")

        if vehicle_id:
            # Store the latest data
            bus_data[vehicle_id] = {
                **data,
                "last_update": datetime.now().isoformat()
            }

            if vehicle_id :
                # Add latest timestamp
                data["last_update"] = datetime.now().isoformat()

                # Storing in appropriate dictionary based on type
                if vehicle_type == "METRO":
                    metro_data[vehicle_id] = data
                else:
                    bus_data[vehicle_id] = data

                # Storing in combined view as well
                all_vehicles[vehicle_id] = data  # Adds/updates the vehicle in the dict

                # Storing history (Keeping the last 100 points per vehicle)
                if vehicle_id not in vehicle_history:
                    vehicle_history[vehicle_id] = []

                vehicle_history[vehicle_id].append(data)

                # Keeping only the last 100 points
                if len(vehicle_history[vehicle_id]) > 100:
                    vehicle_history[vehicle_id] = vehicle_history[vehicle_id][-100:]
                
                # Broadcasting to websocket client

                #Log for debugging
                vehicle_emoji = "🚇" if vehicle_type == "METRO" else "🚌"
                status = data.get("status", "UNKNOWN")
                location = data.get("current_stop", data.get("next_stop", "UNKNOWN"))

                print(f"{vehicle_emoji} {vehicle_id[:25]:25} | {status:8} | {location[:30]:30}")

    except Exception as e:
        print(f"❌ Error processing message: {e}")


async def broadcast_update(data: dict):
    """Broadcast update to all connected WebSocket clients"""
    if websocket_connections:
        disconnected = []
        for websocket in websocket_connections:
            try:
                await websocket.send_json(data)
            except:
                disconnected.append(websocket)

        # Removing disconnected clients
        for websocket in disconnected:
            websocket_connections.remove(websocket)

# Setting MQTT Callbacks
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Connecting to the mqtt broker
try:
    mqtt_client.connect("localhost", 1883, 60)
    mqtt_client.loop_start()
except Exception as e:
    print(f"❌ Failed to connect to MQTT broker: {e}")


# ============================================================================
                            #  REST API ENDPOINTS  #
# ============================================================================


@app.get("/")
def root():
    """API root Endpoint"""
    return {
        "message": "Smart Transport API",
        "version": "1.0.0",
        "description": "Real-time bus and metro tracking system",
        "endpoints": {
            "all_vehicles": "/api/vehicles",
            "buses_only": "/api/buses",
            "metros_only": "/api/metros",
            "single_vehicle": "/api/vehicles/{vehicle_id}",
            "active_vehicles": "/api/vehicles/active",
            "vehicle_history": "/api/vehicles/{vehicle_id}/history",
            "routes": "/api/routes",
            "stats": "/api/stats",
            "websocket": "/ws"
        }
    }


@app.get("/api/vehicles")
def get_all_vehicles():
    """Get all vehicles (buses + metros) with their latest data"""
    return {
        "total": len(all_vehicles),
        "buses": len(bus_data),
        "metros": len(metro_data),
        "timestamp": datetime.now().isoformat(),
        "vehicles": all_vehicles
    }



@app.get("/api/buses")
def get_all_buses():
    """To get all the buses with their latest data"""
    return {
        "total": len(bus_data),
        "timestamp": datetime.now().isoformat(),
        "buses": bus_data
    }


@app.get("/api/metros")
def get_metros_only():
    """Get all the metros with latest data"""
    return {
        "total": len(metro_data),
        "timestamp": datetime.now().isoformat(),
        "vehicles": metro_data
    }


@app.get("/api/vehicles/active")
def get_active_vehicles():
    """To get only the active vehicles i.e., updated in the last 30 seconds"""
    now = time.time()
    active = {
        bus_id: data
        for bus_id, data in bus_data.items()
        if now - data.get("timestamp", 0) < 30
    }

    # Seperate type
    active_buses = {k: v for k, v in active.items() if v.get("vehicle_type") == "BUS"}
    active_metros = {k: v for k, v in active.items() if v.get("vehicle_type") == "METRO"}

    return {
        "total": len(active),
        "buses": len(active_buses),
        "metros": len(active_metros),
        "timestamp": datetime.now().isoformat(),
        "vehicles": active
    }



@app.get("/api/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    """Get data for a specific vehicle"""
    if vehicle_id in all_vehicles:
        return all_vehicles[vehicle_id]
    return {"error": "Vehicle not found"}, 404



@app.get("/api/vehicles/{vehicle_id}/history")
def get_vehicle_history(vehicle_id: str, limit: int = 100):
    """Get position history for a specific vehicle"""
    if vehicle_id in vehicle_history:
        history = vehicle_history[vehicle_id][-limit:]
        return {
            "vehicle_id": vehicle_id,
            "vehicle_type": history[-1].get("vehicle_type", "BUS") if history else "UNKNOWN",
            "points": len(history),
            "history": history
        }
    return {"error": "Vehicle not found"}, 404



@app.get("/api/routes")
def get_routes():
    """To get all the active routes"""
    bus_routes = {}
    metro_routes = {}

    for vehicle_id, data in all_vehicles.items():
        route_id = data.get("route_id")
        route_name = data.get("route_name")
        vehicle_type = data.get("vehicle_type", "BUS")

        if not route_id:
            continue

        routes_dict = metro_routes if vehicle_type == "METRO" else bus_routes

        if route_id not in routes_dict:
            routes_dict[route_id] = {
                "route_id": route_id,
                "route_name": route_name,
                "vehicle_type": vehicle_type,
                "vehicles": []
            }

        routes_dict[route_id]["vehicles"].append(vehicle_id)
        
    return {
        "total_routes": len(bus_routes) + len(metro_routes),
        "bus_routes": len(bus_routes),
        "metro_routes": len(metro_routes),
        "buses": list(bus_routes.values()),
        "metros": list(metro_routes.values()) 
    }


@app.get("/api/stats")
def get_stats():
    """Get system statitics"""
    now = time.time()

    # Overall stats
    total_vehicles = len(all_vehicles)
    active_vehicles = sum(1 for data in all_vehicles.values() if now - data.get("timestamp", 0) < 30)
    moving_vehicles = sum(1 for data in all_vehicles.values() if data.get("status") == "MOVING")
    stopped_vehicles = sum(1 for data in all_vehicles.values() if data.get("status") == "AT_STOP")

    # Bus-specific stats
    total_buses = len(bus_data)
    active_buses = sum(1 for data in bus_data.values() if now - data.get("timestamp", 0) < 30)
    bus_passengers = sum(data.get("passengers", 0) for data in bus_data.values())

    # Metro-specific stats
    total_metros = len(metro_data)
    active_metros = sum(1 for data in metro_data.values() if now - data.get("timestamp", 0) < 30)
    metro_passengers = sum(data.get("passengers", 0) for data in metro_data.values())

    # Route stats
    bus_routes = set(data.get("route_id") for data in bus_data.values() if data.get("route_id"))
    metro_routes = set(data.get("route_id") for data in metro_data.values() if data.get("route_id"))

    # Average occupancy
    avg_bus_occupancy = sum(data.get("occupancy_percent", 0) for data in bus_data.values()) / max(len(bus_data), 1)
    avg_metro_occupancy = sum(data.get("occupancy_percent", 0) for data in metro_data.values()) / max(len(metro_data), 1)

    return {
        "timestamp": datetime.now().isoformat(),
        "overall": {
            "total_vehicles": total_vehicles,
            "active_vehicles": active_vehicles,
            "moving": moving_vehicles,
            "stopped": stopped_vehicles
        },
        "buses": {
            "total": total_buses,
            "active": active_buses,
            "routes": len(bus_routes),
            "passengers": bus_passengers,
            "avg_occupancy_percent": round(avg_bus_occupancy, 1)
        },
        "metros": {
            "total": total_metros,
            "active": active_metros,
            "routes": len(metro_routes),
            "passengers": metro_passengers,
            "avg_occupancy_percent": round(avg_metro_occupancy, 1)
        },
        "passengers": {
            "total": bus_passengers + metro_passengers,
            "buses": bus_passengers,
            "metros": metro_passengers
        }
    }



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    websocket_connections.append(websocket)
    print(f"✅ WebSocket connected. Total connections: {len(websocket_connections)}")
    
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        websocket_connections.remove(websocket)
        print(f"❌ WebSocket disconnected. Remaining: {len(websocket_connections)}")


@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("🛑 MQTT client disconnected")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)






            