'use client'

import { useEffect, useState } from 'react';
import { Map as MapIcon, MapPin, Navigation } from 'lucide-react';

export default function MapView() {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
    const [center, setCenter] = useState({ lat: 10.0261, lng: 76.3125 }); // Kochi coordinates

    useEffect(() => {
        fetchVehicles();
        const interval = setInterval(fetchVehicles, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/vehicles');
            if (!res.ok) {
                setVehicles([]);
                return;
            }

            const data = await res.json();

            // backend returns: { total, buses, metros, timestamp, vehicles: { [id]: {...} } }
            const vehicleList = Array.isArray(data.vehicles)
                ? data.vehicles
                : Object.values(data.vehicles || {});

            setVehicles(vehicleList as any[]);
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
            setVehicles([]);
        }
    };

    // Calculate bounds
    const bounds = vehicles.length > 0 ? {
        minLat: Math.min(...vehicles.map(v => v.latitude)),
        maxLat: Math.max(...vehicles.map(v => v.latitude)),
        minLng: Math.min(...vehicles.map(v => v.longitude)),
        maxLng: Math.max(...vehicles.map(v => v.longitude))
    } : null;

    const mapToPixel = (lat: number, lng: number) => {
        if (!bounds) return { x: 0, y: 0 };

        const width = 800;
        const height = 600;
        const padding = 50;

        const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - 2 * padding);
        const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (height - 2 * padding);

        return { x, y };
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
                <MapIcon className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Live Vehicle Map</h2>
                <div className="ml-auto text-gray-400 text-sm">
                    {vehicles.length} vehicles active
                </div>
            </div>

            {/* Map Area */}
            <div className="bg-gray-900 rounded-lg overflow-hidden relative" style={{ height: '600px' }}>
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}
                />

                {/* Legend */}
                <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur rounded-lg p-4 z-10">
                    <div className="text-white font-bold mb-2">Legend</div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-gray-300">Bus (Moving)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-gray-300">Metro (Moving)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-gray-300">At Stop</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-gray-300">Overcrowded</span>
                        </div>
                    </div>
                </div>

                {/* Vehicle Markers */}
                <svg className="absolute inset-0 w-full h-full">
                    {/* Routes (lines connecting vehicles of same route) */}
                    {vehicles.length > 0 && Object.entries(
                        vehicles.reduce((acc: any, v) => {
                            if (!acc[v.route_id]) acc[v.route_id] = [];
                            acc[v.route_id].push(v);
                            return acc;
                        }, {})
                    ).map(([routeId, routeVehicles]: [string, any]) => {
                        const sorted = routeVehicles.sort((a: any, b: any) => 
                            a.bus_id.localeCompare(b.bus_id)
                        );
                        
                        return sorted.map((vehicle: any, idx: number) => {
                            if (idx === sorted.length - 1) return null;
                            
                            const pos1 = mapToPixel(vehicle.latitude, vehicle.longitude);
                            const pos2 = mapToPixel(sorted[idx + 1].latitude, sorted[idx + 1].longitude);
                            
                            return (
                                <line
                                    key={`${vehicle.bus_id}-${sorted[idx + 1].bus_id}`}
                                    x1={pos1.x}
                                    y1={pos1.y}
                                    x2={pos2.x}
                                    y2={pos2.y}
                                    stroke={vehicle.vehicle_type === 'METRO' ? '#a855f7' : '#22c55e'}
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                    opacity="0.3"
                                />
                            );
                        });
                    })}

                    {/* Vehicle Points */}
                    {vehicles.map((vehicle) => {
                        const pos = mapToPixel(vehicle.latitude, vehicle.longitude);
                        const isSelected = selectedVehicle === vehicle.bus_id;
                        const isOvercrowded = vehicle.occupancy_percent > 85;
                        const isAtStop = vehicle.status === 'AT_STOP';
                        
                        const color = 
                            isOvercrowded ? '#ef4444' :
                            isAtStop ? '#eab308' :
                            vehicle.vehicle_type === 'METRO' ? '#a855f7' : '#22c55e';

                        return (
                            <g key={vehicle.bus_id}>
                                {/* Selection ring */}
                                {isSelected && (
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r="15"
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2"
                                        opacity="0.5"
                                        className="animate-ping"
                                    />
                                )}

                                {/* Vehicle marker */}
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r="8"
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="2"
                                    className={`cursor-pointer transition-all hover:r-10 ${isOvercrowded ? 'animate-pulse' : ''}`}
                                    onClick={() => setSelectedVehicle(vehicle.bus_id)}
                                />

                                {/* Vehicle ID label */}
                                {isSelected && (
                                    <text
                                        x={pos.x}
                                        y={pos.y - 15}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="bold"
                                        className="drop-shadow-lg"
                                    >
                                        {vehicle.bus_id}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Vehicle Info Panel */}
                {selectedVehicle && (() => {
                    const vehicle = vehicles.find(v => v.bus_id === selectedVehicle);
                    if (!vehicle) return null;

                    return (
                        <div className="absolute bottom-4 right-4 bg-gray-800/95 backdrop-blur rounded-lg p-4 w-80 z-10">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-white font-bold text-lg">{vehicle.bus_id}</h3>
                                    <p className="text-gray-400 text-sm">{vehicle.route_name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedVehicle(null)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-gray-400 text-xs">Status</div>
                                    <div className="text-white font-medium">{vehicle.status.replace('_', ' ')}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-xs">Speed</div>
                                    <div className="text-white font-medium">{vehicle.speed} km/h</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-xs">Passengers</div>
                                    <div className="text-white font-medium">{vehicle.passengers}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-xs">Occupancy</div>
                                    <div className={`font-medium ${
                                        vehicle.occupancy_percent > 85 ? 'text-red-400' :
                                        vehicle.occupancy_percent > 60 ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        {vehicle.occupancy_percent}%
                                    </div>
                                </div>
                            </div>

                            {vehicle.status === 'AT_STOP' && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <div className="flex items-center gap-2 text-yellow-400">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">At: {vehicle.current_stop}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">Moving</div>
                    <div className="text-white text-xl font-bold">
                        {vehicles.filter(v => v.status === 'MOVING').length}
                    </div>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">At Stop</div>
                    <div className="text-white text-xl font-bold">
                        {vehicles.filter(v => v.status === 'AT_STOP').length}
                    </div>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">Overcrowded</div>
                    <div className="text-red-400 text-xl font-bold">
                        {vehicles.filter(v => v.occupancy_percent > 85).length}
                    </div>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">Avg Occupancy</div>
                    <div className="text-white text-xl font-bold">
                        {vehicles.length > 0 
                            ? Math.round(vehicles.reduce((sum, v) => sum + v.occupancy_percent, 0) / vehicles.length)
                            : 0}%
                    </div>
                </div>
            </div>
        </div>
    );
}