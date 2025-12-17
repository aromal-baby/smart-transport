export interface Vehicle {
    bus_id: string;
    vehicle_type: "BUS" | "METRO";
    route_id: string;
    route_name: string;
    status: "MOVING" | "AT_STOP";
    latitude: number;
    longitude: number;
    speed: number;
    passengers: number;
    occupancy_percent: number;
    current_stop?: string;      // Optional (only when AT_STOP)
    next_stop?: string;         // Optional (only when MOVING)
    timestamp: number;
    last_update: string
}


export interface ApiResponse {
    total: number;
    buses: number;
    metros: number;
    timestamp: string;
    vehicles: Record<string, Vehicle>;  // Object with vehicle IDs as keys             
}


export interface Stats {
    overall: {
        total_vehicles: number;
        active_vehicles: number;
        moving: number;
        stopped: number;
    };
    buses: {
        total: number;
        active: number;
        routes: number;
        passengers: number;
        avg_occupancy_percent: number;
    };
    metros: {
        total: number;
        active: number;
        routes: number;
        passengers: number;
        avg_occupancy_percent: number;
    };
}