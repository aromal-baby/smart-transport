'use client'

import { useState } from "react"
import { useVehicles } from "../hooks/useVehicles"
import { useFilteredvehicles } from "../hooks/useFilteredvehicles"
import StatsPanel from "../components/StatsPanel"
import AnalyticsDashboard from "../components/AnalyticsDashboard"
import { Bus, Train, RefreshCw, AlertCircle, Activity, TrendingUp, Clock, BarChart } from 'lucide-react'
import { Vehicle } from "../types/vehicles"


export default function Dashboard() {
  const { vehicles, stats, loading, error, refetch } = useVehicles(5000);
  const [ filter, setFilter ] = useState<'all' | 'bus' | 'metro'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [ activeTab, setActiveTab ] = useState<'vehicles' | 'analytics'>('vehicles');

  const filteredVehicles = useFilteredvehicles(vehicles, filter);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500)
  };

  // Group vehicles by route
  const vehiclesByRoute = filteredVehicles.reduce((acc, vehicle) => {
    const routeId = vehicle.route_id || 'unknown';
    if (!acc[routeId]) {
      acc[routeId] = {
        route_id: routeId,
        route_name: vehicle.route_name || 'Unknown Route',
        vehicle_type: vehicle.vehicle_type,
        vehicles: []
      };
    }
    acc[routeId].vehicles.push(vehicle);
    return acc;
  }, {} as Record<string, { route_id: string; route_name: string; vehicle_type: string; vehicles: Vehicle[] }>);

  const routes = Object.values(vehiclesByRoute);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Smart Transport Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">Real-time IoT Vehicle Tracking & Analytics</p>
            </div>

            <div className="flex gap-2">
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
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'vehicles' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <Bus className="w-4 h-4" />
              Live Vehicles
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <BarChart className="w-4 h-4" />
              Analytics & Insights
            </button>
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

        {/* Stats Panel */}
        <StatsPanel stats={stats} loading={loading} />

        {/* Content based on active tab */}
        {activeTab === 'analytics' ? (
          <AnalyticsDashboard />
        ) : (
          <>
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

            {/* Routes List */}
            {loading && vehicles.length === 0 ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading vehicles...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-20 bg-gray-800 rounded-lg">
                <Bus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No vehicles found</p>
                <p className="text-gray-500 text-sm mt-2">Make sure the simulator is running</p>
              </div>
            ) : (
              <div className="space-y-6">
                {routes.map((route) => (
                  <RouteCard 
                    key={route.route_id} 
                    route={route}
                    selectedVehicle={selectedVehicle}
                    onVehicleSelect={setSelectedVehicle}
                  />
                ))}
              </div>
            )}
          </>
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

// Deutsche Bahn Style Route Card
function RouteCard({ route, selectedVehicle, onVehicleSelect }: any) {
  const vehicleIcon = route.vehicle_type === 'METRO' ? '🚇' : '🚌';
  const typeColor = route.vehicle_type === 'METRO'
    ? 'from-purple-500 to-purple-700'
    : 'from-green-500 to-green-700';

  const avgOccupancy = route.vehicles.reduce((sum: number, v: Vehicle) => sum + v.occupancy_percent, 0) / route.vehicles.length;
  const movingCount = route.vehicles.filter((v: Vehicle) => v.status === 'MOVING').length;

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl">
      {/* Route Header */}
      <div className={`bg-gradient-to-r ${typeColor} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{vehicleIcon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{route.route_id}</h2>
                <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                  {route.vehicle_type}
                </span>
              </div>
              <p className="text-white/90 text-sm mt-1">{route.route_name}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-white">{route.vehicles.length}</div>
            <div className="text-white/80 text-sm">Vehicles</div>
          </div>
        </div>

        {/* Route Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-white/70 text-xs mb-1">Moving</div>
            <div className="text-white text-xl font-bold">{movingCount}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-white/70 text-xs mb-1">Stopped</div>
            <div className="text-white text-xl font-bold">{route.vehicles.length - movingCount}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-white/70 text-xs mb-1">Avg Occupancy</div>
            <div className="text-white text-xl font-bold">{avgOccupancy.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="p-4 space-y-3">
        {route.vehicles.map((vehicle: Vehicle) => (
          <VehicleRow 
            key={vehicle.bus_id} 
            vehicle={vehicle}
            isSelected={selectedVehicle === vehicle.bus_id}
            onClick={() => onVehicleSelect(vehicle.bus_id)}
          />
        ))}
      </div>
    </div>
  );
}

// Deutsche Bahn Style Vehicle Row
function VehicleRow({ vehicle, isSelected, onClick }: { vehicle: Vehicle; isSelected: boolean; onClick: () => void }) {
  const isActive = (Date.now() - vehicle.timestamp * 1000) / 1000 < 30;
  const isMoving = vehicle.status === 'MOVING';
  
  const occupancyColor = 
    vehicle.occupancy_percent > 85 ? 'text-red-400' :
    vehicle.occupancy_percent > 60 ? 'text-yellow-400' :
    'text-green-400';

  return (
    <div 
      onClick={onClick}
      className={`bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-all cursor-pointer border-l-4 ${
        isSelected ? 'border-blue-500 bg-gray-700' : 
        isMoving ? 'border-green-500' : 'border-yellow-500'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Vehicle Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="font-bold text-white text-lg">{vehicle.bus_id}</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 min-w-[120px]">
            {isMoving ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <Clock className="w-4 h-4 text-yellow-400" />
            )}
            <span className={`font-medium ${isMoving ? 'text-green-400' : 'text-yellow-400'}`}>
              {vehicle.status.replace('_', ' ')}
            </span>
          </div>

          {/* Location */}
          <div className="flex-1 min-w-[250px]">
            <div className="text-gray-300 text-sm">
              {vehicle.status === 'AT_STOP' ? (
                <>
                  <span className="text-gray-500">At:</span> {vehicle.current_stop}
                </>
              ) : (
                <>
                  <span className="text-gray-500">Next:</span> {vehicle.next_stop || 'Unknown'}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Metrics */}
        <div className="flex items-center gap-6">
          {/* Speed */}
          <div className="text-center min-w-[80px]">
            <div className="text-gray-400 text-xs mb-1">Speed</div>
            <div className="text-white font-bold text-lg">{vehicle.speed} km/h</div>
          </div>

          {/* Passengers */}
          <div className="text-center min-w-[100px]">
            <div className="text-gray-400 text-xs mb-1">Passengers</div>
            <div className="text-white font-bold text-lg">{vehicle.passengers}</div>
          </div>

          {/* Occupancy */}
          <div className="text-center min-w-[100px]">
            <div className="text-gray-400 text-xs mb-1">Occupancy</div>
            <div className={`font-bold text-lg ${occupancyColor}`}>
              {vehicle.occupancy_percent.toFixed(0)}%
            </div>
          </div>

          {/* Last Update */}
          <div className="text-center min-w-[80px]">
            <div className="text-gray-400 text-xs mb-1">Updated</div>
            <div className="text-gray-300 text-sm">
              {Math.floor((Date.now() - vehicle.timestamp * 1000) / 1000)}s ago
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy Bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all ${
              vehicle.occupancy_percent > 85 ? 'bg-red-500' :
              vehicle.occupancy_percent > 60 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(vehicle.occupancy_percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}