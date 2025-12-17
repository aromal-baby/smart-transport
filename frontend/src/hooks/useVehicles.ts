'use client';

import { useState, useEffect } from 'react';
import { ApiResponse, Vehicle, Stats } from '../types/vehicles';

// Custom hook - reusable logic for fetching vehicle data
export function useVehicles(refreshInterval = 5000) {

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<String | null>(null);

    // function to fetch vehicles from API
    const fetchVehicles = async() => {
        try {
            const response = await fetch('http://localhost:8000/api/vehicles');

            if (!response.ok) {
                throw new Error('Failed to fetch vehicles')
            }

            const data: ApiResponse = await response.json();

            // Convert object to array for easier mapping
            const vehicleArray = Object.values(data.vehicles);
            setVehicles(vehicleArray);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };


    // Function to fetch stats
    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/stats');
            const data: Stats = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };


    // useEffect runs when components mounts
    useEffect(() => {
        // Fetch immediately
        fetchVehicles();
        fetchStats();

        // Then fetch every 5 seconds (for custom interval)
        const interval = setInterval(() => {
            fetchVehicles();
            fetchStats();
        }, refreshInterval);

        // Cleanup: stop interval when component unmounts
        return() => clearInterval(interval);
    }, [refreshInterval]);
    
    return { vehicles, stats, loading, error, refetch: fetchVehicles };
} 