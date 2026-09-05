'use client'

import { useState } from 'react';
import { Plus, Trash2, Bus, Train, Save, X } from 'lucide-react';

interface VehicleFormData {
    vehicle_id: string;
    vehicle_type: 'BUS' | 'METRO';
    route_id: string;
    route_name: string;
    capacity: number;
}

export default function VehicleManagement() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<VehicleFormData>({
        vehicle_id: '',
        vehicle_type: 'BUS',
        route_id: '',
        route_name: '',
        capacity: 50
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/api/vehicles/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('✅ Vehicle added successfully!');
                setShowAddForm(false);
                setFormData({
                    vehicle_id: '',
                    vehicle_type: 'BUS',
                    route_id: '',
                    route_name: '',
                    capacity: 50
                });
                fetchVehicles();
            }
        } catch (error) {
            alert('❌ Failed to add vehicle');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (vehicleId: string) => {
        if (!confirm(`Delete ${vehicleId}?`)) return;

        try {
            const res = await fetch(`http://localhost:8000/api/vehicles/${vehicleId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('✅ Vehicle removed');
                fetchVehicles();
            }
        } catch (error) {
            alert('❌ Failed to delete vehicle');
        }
    };

    const fetchVehicles = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/vehicles');
            if (res.ok) {
                const data = await res.json();
                setVehicles(data.vehicles || []);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles');
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Vehicle Management</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? 'Cancel' : 'Add Vehicle'}
                </button>
            </div>

            {/* Add Vehicle Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="bg-gray-700/50 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Vehicle ID</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., BUS_R1_09"
                                value={formData.vehicle_id}
                                onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Vehicle Type</label>
                            <select
                                value={formData.vehicle_type}
                                onChange={(e) => setFormData({...formData, vehicle_type: e.target.value as 'BUS' | 'METRO'})}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            >
                                <option value="BUS">Bus</option>
                                <option value="METRO">Metro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Route ID</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., R1"
                                value={formData.route_id}
                                onChange={(e) => setFormData({...formData, route_id: e.target.value})}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Route Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., Edapally - Palarivattom"
                                value={formData.route_name}
                                onChange={(e) => setFormData({...formData, route_name: e.target.value})}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Capacity</label>
                            <input
                                type="number"
                                required
                                min="10"
                                max="200"
                                value={formData.capacity}
                                onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-4 flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Adding...' : 'Add Vehicle'}
                    </button>
                </form>
            )}

            {/* Vehicle List */}
            <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-700/30 rounded text-gray-400 text-sm font-medium">
                    <div>Vehicle ID</div>
                    <div>Type</div>
                    <div>Route</div>
                    <div>Capacity</div>
                    <div>Action</div>
                </div>

                {vehicles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No vehicles configured</p>
                        <button 
                            onClick={fetchVehicles}
                            className="mt-2 text-blue-400 hover:underline"
                        >
                            Load vehicles
                        </button>
                    </div>
                ) : (
                    vehicles.map((vehicle) => (
                        <div key={vehicle.vehicle_id} className="grid grid-cols-5 gap-4 px-4 py-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors items-center">
                            <div className="text-white font-medium">{vehicle.vehicle_id}</div>
                            <div className="flex items-center gap-2 text-gray-300">
                                {vehicle.vehicle_type === 'BUS' ? <Bus className="w-4 h-4" /> : <Train className="w-4 h-4" />}
                                {vehicle.vehicle_type}
                            </div>
                            <div className="text-gray-300">{vehicle.route_name}</div>
                            <div className="text-gray-300">{vehicle.capacity} seats</div>
                            <div>
                                <button
                                    onClick={() => handleDelete(vehicle.vehicle_id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}