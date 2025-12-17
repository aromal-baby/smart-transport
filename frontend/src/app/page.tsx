'use client'

import { useState } from "react"
import { useVehicles } from "../hooks/useVehicles"
import { useFilteredvehicles } from "../hooks/useFilteredvehicles"
import StatsPanel from "../components/StatsPanel"
import dynamic from 'next/dynamic'
import { Bus, Train, RefreshCw, AlertCircle, Activity, MapPin } from 'lucide-react'
import { Vehicle } from "../types/vehicles"


const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading : () => <div className="text-white text-center py-20">Loading map...</div>
}) 


export default function Dashboard() {
  const { vehicles, stats, loading, error, refetch } = useVehicles(5000);
  const [ filter, setFilter ] = useState<'all' | 'bus' | 'metro'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const filteredVehicles = useFilteredvehicles(vehicles, filter);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500)
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Smart Transport Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">Real-time IoT vehicle Tracking System</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {showMap ? 'Hide' : 'Show'} Map
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-medium text-red-200">Connection Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        <StatsPanel stats={stats} loading={loading} />

        {/* Map Section */}
        {showMap && (
          <div className="mb-6">
            <Map 
              vehicles={filteredVehicles}
              selectedVehicleId={selectedVehicle}
              onVehicleClick={setSelectedVehicle}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <FilterButton 
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            icon={<Activity className="w-4 h-4 " />}
            label="All Vehicles"
            count={vehicles.length}
          />
          <FilterButton 
            active={filter === 'bus'}
            onClick={() => setFilter('bus')}
            icon={<Bus className="w-4 h-4 " />}
            label="Buses"
            count={vehicles.filter(v => v.vehicle_type === 'BUS').length}
          />
          <FilterButton 
            active={filter === 'metro'}
            onClick={() => setFilter('metro')}
            icon={<Train className="w-4 h-4 " />}
            label="Metros"
            count={vehicles.filter(v => v.vehicle_type === 'METRO').length}
          />
        </div>

        {/* Vehicles Grid */}
        {loading && vehicles.length === 0 ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-lg">
            <Bus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No vehicles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard 
                key={vehicle.bus_id} 
                vehicle={vehicle}
                isSelected={selectedVehicle === vehicle.bus_id}
                onClick={() => setSelectedVehicle(vehicle.bus_id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterButton({ active, onClick, icon, label, count }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex item-center gap-2 px-4 py-2 rounded-lg transition-all ${
        active ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-blue-500' : 'bg-gray-700'}`}>
        {count}
      </span>
    </button>
  );
}


function VehicleCard({ vehicle, isSelected, onClick }: { vehicle: Vehicle; isSelected: boolean; onClick: () => void }) {
  
  const isActive = (Date.now() - vehicle.timestamp * 1000) / 1000 < 30;
  const vehicleIcon = vehicle.vehicle_type === 'METRO' ? '🚇' : '🚌';
  const typeColor = vehicle.vehicle_type === 'METRO'
    ? 'bg-purple-900/50 border-purple-500'
    : 'bg-green-900/50 border-green-500';

  return (
    <div 
      onClick={onClick}
      className={`bg-gray-800 rounded-lg p-4 border ${typeColor} hover:shadow-lg transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{vehicleIcon}</span>
          <div>
            <h3 className="font-bold text-white">{vehicle.bus_id}</h3>
            <p className="text-xs text-gray-400">{vehicle.vehicle_type}</p>
          </div>
        </div>
        <div className={`flex item-center gap-1 ${vehicle.status === 'MOVING' ? 'text-green-400' : 'text-yellow-400'}`}>
          <Activity className="w-4 h-4" />
           <span className="text-xs font-medium">{vehicle.status}</span>
        </div>
      </div> 

      <div className="mb-3">
        <p className="text-sm text-gray-400 mb-1">Route</p>
        <p className="text-white font-medium text-sm">{vehicle.route_name}</p>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-400 mb-1">
          {vehicle.status === 'AT_STOP' ? 'Current Stop' : 'Next Stop'}
        </p>
        <p className="text-white text-sm">{vehicle.current_stop || vehicle.next_stop || 'Unknown'}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-700">
        <div>
          <p className="text-xs text-gray-400">Speed</p>
          <p className="text-white font-bold">{vehicle.speed} km/h</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Passengers</p>
          <p className="text-white font-bold">{vehicle.passengers}/{vehicle.capacity}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Occupancy</p>
          <p className="text-white font-bold">{vehicle.occupancy_percent.toFixed(0)}%</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={isActive ? 'text-green-400' : 'text-red-400'}>
          {isActive ? '● Live' : '● Offline'}
        </span>
        <span className="text-gray-500">
          {Math.floor((Date.now() - vehicle.timestamp * 1000) / 1000)}s ago
        </span>
      </div>
    </div>
  )
}