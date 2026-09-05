'use client'

import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Info, Download } from 'lucide-react';

export default function HistoricalTrends() {
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
    const [trends, setTrends] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrends();
    }, [timeRange]);

    const fetchTrends = async () => {
        setLoading(true);
        try {
            const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
            const response = await fetch(`http://localhost:8000/api/analytics/trends?hours=${hours}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Trends data loaded:', data);
                setTrends(data);
            }
        } catch (error) {
            console.error('Failed to fetch trends:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-700 rounded w-1/3"></div>
                    <div className="h-80 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (!trends || !trends.hourly_data || trends.hourly_data.length === 0) {
        return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Historical Trends</h2>
                <div className="text-center py-20">
                    <Info className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 text-lg">No historical data available yet</p>
                    <p className="text-gray-500 text-sm mt-2">System is collecting data. Check back in a few minutes.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Time Range Selector */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-3 rounded-lg">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Historical Performance</h2>
                            <p className="text-gray-400 text-sm">Vehicle occupancy and speed trends over time</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {(['24h', '7d', '30d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                                    timeRange === range
                                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-500/30 rounded-lg p-5">
                    <div className="text-blue-300 text-sm mb-1">Average Occupancy</div>
                    <div className="text-white text-4xl font-bold mb-1">
                        {trends.summary?.avg_occupancy || 0}%
                    </div>
                    <div className="text-gray-400 text-xs">Across all routes</div>
                </div>
                <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-500/30 rounded-lg p-5">
                    <div className="text-orange-300 text-sm mb-1">Peak Occupancy</div>
                    <div className="text-white text-4xl font-bold mb-1">
                        {trends.summary?.peak_occupancy || 0}%
                    </div>
                    <div className="text-gray-400 text-xs">Maximum recorded</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-500/30 rounded-lg p-5">
                    <div className="text-green-300 text-sm mb-1">Average Speed</div>
                    <div className="text-white text-4xl font-bold mb-1">
                        {trends.summary?.avg_speed || 0}
                    </div>
                    <div className="text-gray-400 text-xs">km/h fleet average</div>
                </div>
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-500/30 rounded-lg p-5">
                    <div className="text-purple-300 text-sm mb-1">Total Data Points</div>
                    <div className="text-white text-4xl font-bold mb-1">
                        {trends.summary?.total_readings?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-400 text-xs">Readings analyzed</div>
                </div>
            </div>

            {/* Occupancy Chart */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Occupancy Levels Over Time</h3>
                        <p className="text-gray-400 text-sm">Passenger load by hour</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span className="text-gray-400">Normal (0-60%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span className="text-gray-400">Busy (60-85%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span className="text-gray-400">Overcrowded (85%+)</span>
                        </div>
                    </div>
                </div>
                
                <div className="relative bg-gray-900/50 rounded-lg p-4" style={{ height: '350px' }}>
                    {/* Y-axis */}
                    <div className="absolute left-2 top-4 bottom-16 flex flex-col justify-between text-gray-400 text-sm w-14 text-right pr-3 font-mono">
                        <span>100%</span>
                        <span>75%</span>
                        <span>50%</span>
                        <span>25%</span>
                        <span>0%</span>
                    </div>

                    {/* Grid lines */}
                    <div className="absolute left-20 right-4 top-4 bottom-16 flex flex-col justify-between pointer-events-none">
                        {[100, 75, 50, 25, 0].map(val => (
                            <div key={val} className="border-t border-gray-700/50 relative">
                                {val === 85 && <div className="absolute right-0 -top-2 text-red-400 text-xs">⚠️ Overcrowding threshold</div>}
                            </div>
                        ))}
                    </div>

                    {/* Chart bars */}
                    <div className="absolute left-20 right-4 top-4 bottom-16 flex items-end gap-1">
                        {trends.hourly_data.slice(0, 24).map((hour: any, idx: number) => {
                            const occupancy = hour.avg_occupancy || 0;
                            const heightPercent = occupancy;
                            const color = 
                                occupancy > 85 ? 'bg-red-500' :
                                occupancy > 60 ? 'bg-yellow-500' :
                                'bg-green-500';

                            // Format time
                            const hourNum = hour.hour ? new Date(hour.hour).getHours() : idx;
                            const timeLabel = `${hourNum.toString().padStart(2, '0')}:00`;

                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full">
                                    <div className="w-full flex items-end h-full">
                                        <div 
                                            className={`w-full ${color} rounded-t transition-all hover:opacity-80 relative`}
                                            style={{ height: `${heightPercent}%` }}
                                        >
                                            {/* Value label on top of bar */}
                                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap border border-gray-600">
                                                    {occupancy.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Detailed tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10 pointer-events-none border border-gray-600 shadow-xl">
                                        <div className="font-bold text-blue-300 mb-1">{timeLabel}</div>
                                        <div className="text-gray-300">Occupancy: {occupancy.toFixed(1)}%</div>
                                        <div className="text-gray-300">Vehicles: {hour.vehicle_count || 0}</div>
                                        <div className="text-gray-400 text-[10px] mt-1">{hour.data_points || 0} data points</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* X-axis labels - showing specific times */}
                    <div className="absolute left-20 right-4 bottom-2 flex justify-between text-gray-400 text-sm font-mono">
                        {[0, 6, 12, 18, 24].map(h => {
                            const time = h === 24 ? 0 : h;
                            const label = h === 0 ? '12 AM' :
                                         h < 12 ? `${h} AM` :
                                         h === 12 ? '12 PM' :
                                         `${h-12} PM`;
                            return <span key={h}>{label}</span>;
                        })}
                    </div>

                    {/* Time range label */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs">
                        {timeRange === '24h' ? 'Last 24 Hours' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                    </div>
                </div>
            </div>

            {/* Speed Chart */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">Average Speed Trends</h3>
                    <p className="text-gray-400 text-sm">Fleet velocity by hour (km/h)</p>
                </div>
                
                <div className="relative bg-gray-900/50 rounded-lg p-4" style={{ height: '280px' }}>
                    {/* Y-axis */}
                    <div className="absolute left-2 top-4 bottom-12 flex flex-col justify-between text-gray-400 text-sm w-14 text-right pr-3 font-mono">
                        <span>50</span>
                        <span>38</span>
                        <span>25</span>
                        <span>13</span>
                        <span>0</span>
                    </div>

                    {/* Grid */}
                    <div className="absolute left-20 right-4 top-4 bottom-12 flex flex-col justify-between pointer-events-none">
                        {[50, 38, 25, 13, 0].map(val => (
                            <div key={val} className="border-t border-gray-700/50"></div>
                        ))}
                    </div>

                    {/* Bars */}
                    <div className="absolute left-20 right-4 top-4 bottom-12 flex items-end gap-1">
                        {trends.hourly_data.slice(0, 24).map((hour: any, idx: number) => {
                            const speed = hour.avg_speed || 0;
                            const heightPercent = (speed / 50) * 100;
                            const hourNum = hour.hour ? new Date(hour.hour).getHours() : idx;
                            const timeLabel = `${hourNum.toString().padStart(2, '0')}:00`;
                            
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full">
                                    <div className="w-full flex items-end h-full">
                                        <div 
                                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                                            style={{ height: `${Math.min(heightPercent, 100)}%` }}
                                        >
                                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap border border-gray-600">
                                                    {speed.toFixed(1)} km/h
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10 pointer-events-none border border-gray-600 shadow-xl">
                                        <div className="font-bold text-blue-300 mb-1">{timeLabel}</div>
                                        <div className="text-gray-300">Speed: {speed.toFixed(1)} km/h</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* X-axis */}
                    <div className="absolute left-20 right-4 bottom-2 flex justify-between text-gray-400 text-sm font-mono">
                        {[0, 6, 12, 18, 24].map(h => {
                            const time = h === 24 ? 0 : h;
                            const label = h === 0 ? '12 AM' :
                                         h < 12 ? `${h} AM` :
                                         h === 12 ? '12 PM' :
                                         `${h-12} PM`;
                            return <span key={h}>{label}</span>;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}