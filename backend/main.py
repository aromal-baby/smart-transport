from fastapi import FastAPI
import json
import paho.mqtt.client as mqtt
import psycopg2
from datetime import datetime
from contextlib import asynccontextmanager

# Global MQTT Client
mqtt_client = None 

# Database connection configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Aromal@8338"
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


# Initializing db on startup if it doesn't exist
def init_database():
    """Creating the table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Creating timescaleBD extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

        # Creating table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bus_telemetry (
                time TIMESTAMPTZ NOT NULL,
                bus_id TEXT NOT NULL,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                speed INTEGER,
                passengers INTEGER
        """)

        # Try to create hypertable (might already exist)
        try:
            cursor.execute("SELECT create_hypertable('bus_telemetry', 'time', if_not_exists => TRUE);")
        except Exception as e:
            print(f"⚠️  Hypertable note: {e}")
        
        # Create index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_bus_id_time 
            ON bus_telemetry (bus_id, time DESC);
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Database initialized successfully")
        
    except Exception as e:
        print(f"❌ Database initialization error: {e}")


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO bus_telemetry (time, bus_id, latitude, longitude, speed, passengers)
            VALUES (to_timestamp(%s), %s, %s, %s, %s, %s)
        """, (
            data['timestamp'],
            data['bus_id'],
            data['latitude'],
            data['longitude'],
            data['speed'],
            data['passengers']
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ Saved: {data['bus_id']} - Speed: {data['speed']}km/h, Passengers: {data['passengers']}")

    except Exception as e:
        print(f"❌ Error: {e}")
    

@asynccontextmanager
async def lifespan(app: FastAPI):

    # Connecting to the bd
    init_database()

    # Connecting to MQTT
    global mqtt_client
    mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_message = on_message

    try:
        mqtt_client.connect("localhost", 1883, 60)
        mqtt_client.subscribe("transport/bus/+/data")
        mqtt_client.loop_start()
        print("✅ Connected to MQTT broker")
    except Exception as e:
        print(f"❌ MQTT connection failed: {e}")

    yield

    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()


app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"message": "Smart Transport API", "status": "running"}

@app.get("/buses/latest")
def get_latest_buses():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT ON (bus_id)
                bus_id, latitude, longitude, speed, passengers, time
            FROM bus_telemetry
            ORDER BY bus_id, time DESC
        """)
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        buses = [
            {
                "bus_id": row[0],
                "latitude": float(row[1]),
                "longitude": float(row[2]),
                "speed": row[3],
                "passengers": row[4],
                "timestamp": row[5].isoformat()
            }
            for row in results
        ]
        return {"buses": buses}
    except Exception as e:
        return {"error": str(e), "buses": []}

@app.get("/health")
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}