"""
GTFS to Routes Config Converter

This script converts GTFS (General Transit Feed Specification) data
to the routes_config.json format used by the bus simulator.

Usage:
1. Download GTFS feed (ZIP file) for your city
2. Extract the ZIP file to a folder
3. Run: python gtfs_converter.py /path/to/gtfs/folder
"""

import pandas as pd
import json
import sys
from pathlib import Path

def load_gtfs_data(gtfs_path):
    """Loading GTFS CSV files"""
    print(f"📂 Loading GTFS data from: {gtfs_path}")
    
    data = {}
    
    # Required files
    try:
        data['stops'] = pd.read_csv(f"{gtfs_path}/stops.txt")
        data['routes'] = pd.read_csv(f"{gtfs_path}/routes.txt")
        data['trips'] = pd.read_csv(f"{gtfs_path}/trips.txt")
        data['stop_times'] = pd.read_csv(f"{gtfs_path}/stop_times.txt")
        print("✅ Loaded required GTFS files")
    except FileNotFoundError as e:
        print(f"❌ Missing required GTFS file: {e}")
        sys.exit(1)
    
    # Optional files
    try:
        data['shapes'] = pd.read_csv(f"{gtfs_path}/shapes.txt")
        print("✅ Loaded shapes.txt (optional)")
    except FileNotFoundError:
        data['shapes'] = None
        print("⚠️  shapes.txt not found (optional)")
    
    return data

def convert_route(route_id, gtfs_data, num_buses=3):
    """Convert a single GTFS route to our config format"""
    
    # Getting route info
    route_info = gtfs_data['routes'][gtfs_data['routes']['route_id'] == route_id].iloc[0]
    
    # Getting trips for this route
    route_trips = gtfs_data['trips'][gtfs_data['trips']['route_id'] == route_id]
    
    if len(route_trips) == 0:
        print(f"⚠️  No trips found for route {route_id}")
        return None
    
    # Getting a representative trip (first one)
    trip_id = route_trips.iloc[0]['trip_id']
    
    # Getting stops for this trip
    trip_stops = gtfs_data['stop_times'][gtfs_data['stop_times']['trip_id'] == trip_id].sort_values('stop_sequence')
    
    # Building stops list
    stops = []
    for _, stop_time in trip_stops.iterrows():
        stop_id = stop_time['stop_id']
        stop_info = gtfs_data['stops'][gtfs_data['stops']['stop_id'] == stop_id]
        
        if len(stop_info) == 0:
            continue
            
        stop_info = stop_info.iloc[0]
        
        stops.append({
            "stop_id": str(stop_id),
            "stop_name": stop_info['stop_name'],
            "latitude": float(stop_info['stop_lat']),
            "longitude": float(stop_info['stop_lon']),
            "dwell_time_seconds": [30, 60]  # Default dwell time
        })
    
    # Generating bus IDs
    buses = []
    route_short_name = route_info.get('route_short_name', route_id)
    for i in range(num_buses):
        buses.append({
            "bus_id": f"BUS_{route_short_name}_{i+1:02d}",
            "start_time": f"06:{i*15:02d}"  # Staggered starts
        })
    
    # Building route config
    config = {
        "route_id": str(route_id),
        "route_name": route_info.get('route_long_name', route_info.get('route_short_name', route_id)),
        "stops": stops,
        "buses": buses,
        "schedule": {
            "morning_peak": {
                "time_range": ["06:00", "09:00"],
                "interval_minutes": [10, 15]
            },
            "day": {
                "time_range": ["09:00", "17:00"],
                "interval_minutes": [20, 25]
            },
            "evening_peak": {
                "time_range": ["17:00", "20:00"],
                "interval_minutes": [10, 15]
            },
            "night": {
                "time_range": ["20:00", "23:00"],
                "interval_minutes": [30, 45]
            }
        }
    }
    
    return config

def main():
    """Main conversion function"""
    if len(sys.argv) < 2:
        print("Usage: python gtfs_converter.py <gtfs_path> [route_ids] [output_path]")
        print("\nExamples:")
        print("  python gtfs_converter.py ./gtfs_data")
        print("  python gtfs_converter.py ./gtfs_data all")
        print("  python gtfs_converter.py ./gtfs_data R1,R2")
        print("  python gtfs_converter.py ./gtfs_data all output.json")
        print("  python gtfs_converter.py ./gtfs_data R1,R2 output.json")
        sys.exit(1)
    
    gtfs_path = sys.argv[1]
    
    # Load GTFS data
    gtfs_data = load_gtfs_data(gtfs_path)
    
    # Show available routes
    print("\n📋 Available routes:")
    print("-" * 80)
    for idx, row in gtfs_data['routes'].iterrows():
        route_id = row['route_id']
        route_name = row.get('route_long_name', row.get('route_short_name', 'Unknown'))
        print(f"  {route_id}: {route_name}")
    print("-" * 80)
    
    # Determine output file
    output_file = "routes_config.json"  # default
    
    # Select routes to convert
    if len(sys.argv) >= 3:
        route_input = sys.argv[2]
        
        # Check if 3rd arg is output path (ends with .json)
        if route_input.endswith('.json'):
            # No routes specified, ask user
            output_file = route_input
            selected_routes = input("Enter route IDs to convert (comma-separated, or 'all'): ").strip()
            
            if selected_routes.lower() == 'all':
                selected_routes = gtfs_data['routes']['route_id'].tolist()
            else:
                selected_routes = [r.strip() for r in selected_routes.split(',')]
        else:
            # Routes specified
            if route_input.lower() == 'all':
                selected_routes = gtfs_data['routes']['route_id'].tolist()
            else:
                selected_routes = [r.strip() for r in route_input.split(',')]
            
            # Check for output path as 4th argument
            if len(sys.argv) >= 4:
                output_file = sys.argv[3]
    else:
        # No arguments provided, ask user
        selected_routes = input("Enter route IDs to convert (comma-separated, or 'all'): ").strip()
        
        if selected_routes.lower() == 'all':
            selected_routes = gtfs_data['routes']['route_id'].tolist()
        else:
            selected_routes = [r.strip() for r in selected_routes.split(',')]
    
    # Convert routes
    converted_routes = []
    print(f"\n🔄 Converting {len(selected_routes)} routes...")
    
    for route_id in selected_routes:
        print(f"\n  Converting route: {route_id}")
        route_config = convert_route(route_id, gtfs_data)
        
        if route_config:
            converted_routes.append(route_config)
            print(f"  ✅ Converted: {route_config['route_name']} ({len(route_config['stops'])} stops)")
        else:
            print(f"  ❌ Failed to convert route {route_id}")
    
    # Save to JSON
    output = {
        "routes": converted_routes
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Conversion complete!")
    print(f"📄 Saved to: {output_file}")
    print(f"📊 Total routes: {len(converted_routes)}")
    print(f"🚌 Total buses: {sum(len(r['buses']) for r in converted_routes)}")
    print(f"🛑 Total stops: {sum(len(r['stops']) for r in converted_routes)}")

if __name__ == "__main__":
    main()

