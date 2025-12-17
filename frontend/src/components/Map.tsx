'use client'

import { useEffect, useRef } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vehicle } from "../types/vehicles";

interface MapProps {
    vehicles: Vehicle[];
    selectedVehicleId?: string | null;
    onVehicleClick?: (vehicleId: string) => void;
}

export default function Map({ vehicles, selectedVehicleId, onVehicleClick }: MapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: string]: L.Marker }>({});
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Initialize map once
    useEffect(() => {
        if (mapRef.current || !mapContainerRef.current) return;
            
        const map = L.map(mapContainerRef.current, {
            center: [9.9312, 76.2673],
            zoom: 12,
            zoomControl: true,
            scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update markers
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        const createDivIcon = (vehicle: Vehicle, isSelected: boolean) => {

            const isBus = vehicle.vehicle_type === 'BUS';
            const isMoving = vehicle.status === 'MOVING';

            const bgColor = isBus ? '#3B82F6' : '#10B981';
            const borderColor = isSelected ? '#FBBF24' : 'white';
            const borderWidth = isSelected ? '3px' : '2px';
            const emoji = isBus ? '🚌' : '🚇';

            return L.divIcon({
                html: `
                    <div style="position: relative; width: 48px; height: 48px;">
                ${isMoving ? `
                    <!-- Pulsing ring (Uber Eats style) -->
                        <div style="
                            position: absolute;
                            width: 48px;
                            height: 48px;
                            background-color: ${bgColor};
                            opacity: 0.3;
                            border-radius: 50%;
                            animation: uber-pulse 2s infinite;
                        "></div>
                    ` : ''}

                    <-- Main vehicle marker -->
                    <div style = "
                        position: absolute;
                        top: 50%;
                        bottom: 50%;
                        transorm: translate (-50%, -50%);
                        width: 40px;
                        background-color: ${bgColor};
                        border: 3px solid ${borderColor};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 20px;
                        bx-shadow: 0 4px 12px rgba (0, 0, 0, 0.3 );
                    ">
                        ${emoji}
                    </div>

                    {isMoving && }
                `,
                className: 'custom-div-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16],
            });
        };

        vehicles.forEach((vehicle) => {
            const { bus_id, latitude, longitude, vehicle_type, status, speed, current_stop, next_stop, capacity, route_name, passengers, occupancy_percent } = vehicle;
            const isSelected = bus_id === selectedVehicleId;

            if (markersRef.current[bus_id]) {
                markersRef.current[bus_id].setLatLng([latitude, longitude]);
                markersRef.current[bus_id].setIcon(createDivIcon(vehicle, isSelected));
            } else {
                const icon = createDivIcon(vehicle, isSelected);
                const marker = L.marker([latitude, longitude], { icon }).addTo(map);

                const popupContent = `
                    <div style="min-width: 220px;">
                        <div style="margin-bottom: 8px;">
                            <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${vehicle_type === 'METRO' ? '🚇' : '🚌'} ${bus_id}</h3>
                        </div>
                        <p><strong>Route:</strong> ${route_name}</p>
                        <p><strong>Status:</strong> ${status}</p>
                        <p><strong>Speed:</strong> ${speed} km/h</p>
                        <p><strong>Passengers:</strong> ${passengers}/${capacity} (${occupancy_percent.toFixed(0)}%)</p>
                        ${current_stop ? `<p><strong>At:</strong> ${current_stop}</p>` : ''}
                        ${next_stop ? `<p><strong>Next:</strong> ${next_stop}</p>` : ''}
                    </div>
                `;

                marker.bindPopup(popupContent);
                marker.on('click', () => {
                    if (onVehicleClick) onVehicleClick(bus_id);
                });
                            
                markersRef.current[bus_id] = marker;
            }
        });

        Object.keys(markersRef.current).forEach((vehicleId) => {
            if (!vehicles.find((v) => v.bus_id === vehicleId)) {
                map.removeLayer(markersRef.current[vehicleId]);
                delete markersRef.current[vehicleId];
            }
        });

        if (selectedVehicleId) {
            const selectedVehicle = vehicles.find(v => v.bus_id === selectedVehicleId);
            if (selectedVehicle && markersRef.current[selectedVehicleId]) {
                map.setView([selectedVehicle.latitude, selectedVehicle.longitude], 15, { animate: true });
                markersRef.current[selectedVehicleId].openPopup();
            }
        }
    }, [vehicles, selectedVehicleId, onVehicleClick]);

    return (
        <div className="relative w-full h-full">
            <div 
                ref={mapContainerRef} 
                className="w-full h-full rounded-lg shadow-lg"
                style={{ minHeight: '500px' }}
            />
      
            <div className="absolute bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg z-[1000]">
                <h4 className="text-white text-sm font-bold mb-2">Legend</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
                        <span className="text-white text-xs">Bus</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                        <span className="text-white text-xs">Metro</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 left-4 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg z-[1000]">
                <p className="text-white text-sm font-medium">
                    🗺️ {vehicles.length} vehicles on map
                </p>
            </div>
        </div>
    );
}