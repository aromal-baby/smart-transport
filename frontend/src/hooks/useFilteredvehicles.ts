// Filtering vehicles hook
import { Vehicle } from "../types/vehicles";

// Custom hook
export function useFilteredvehicles (vehicles: Vehicle[], filter: string) {

    // fist of all if no filters then return all
    if ( !filter || filter == 'all') {
        return vehicles;
    }

    // Filtering by vehicle type
    return vehicles.filter (v => v.vehicle_type === filter.toUpperCase());
}