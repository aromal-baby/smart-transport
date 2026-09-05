'use client'

import { Stats } from "../types/vehicles";
import { Bus, Train, Users, Activity } from 'lucide-react';

interface StatsPanelProps {
    stats: Stats | null;
    loading: boolean;
}

export default function StatsPanel({ stats, loading }: StatsPanelProps) {
    if (loading) {
        return <div className="text-white">Loading stats...</div>;
    }

    if (!stats) {
        return <div className="text-white">No stats available</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Overall stats */}
            <StatCard 
                icon={<Activity className="w-6 h-6"/>}
                title="Total Vehicles"
                value={stats.overall.total_vehicles}
                subtitle={`${stats.overall.active_vehicles} active`}
                color="bg-blue-500"
            />

            {/* Bus stats */}
            <StatCard 
                icon={<Bus className="w-6 h-6" />}
                title="Buses"
                value={stats.buses.total}
                subtitle={`${stats.buses.passengers} passengers`}
                color="bg-green-500"
            />

            {/* Metro stats - FIXED ICON */}
            <StatCard 
                icon={<Train className="w-6 h-6" />}
                title="Metros"
                value={stats.metros.total}
                subtitle={`${stats.metros.passengers} passengers`}
                color="bg-purple-500"
            />

            {/* Total Passengers */}
            <StatCard 
                icon={<Users className="w-6 h-6" />}
                title="Total Passengers"
                value={stats.buses.passengers + stats.metros.passengers}
                subtitle={`Avg: ${Math.round((stats.buses.avg_occupancy_percent + stats.metros.avg_occupancy_percent) / 2)}% full`}
                color="bg-orange-500"
            />
        </div>
    );
}


// Reusable StatCard component
interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    subtitle: string;
    color: string;
}


function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex item-center justify-between mb-2">
                <div className={`${color} p-2 rounded-lg text-white`}>
                    {icon}
                </div>
                <span className="text-2xl font-bold text-white">{value}</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
        </div>
    );
}