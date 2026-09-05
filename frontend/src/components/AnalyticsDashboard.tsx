'use client'

import { useState } from 'react';
import { useEffect } from 'react';
import { TrendingUp, DollarSign, AlertCircle, Award, BarChart3, Map, Brain, Download, Settings } from 'lucide-react';
import HistoricalTrends from './HistoricalTrends';
import MapView from './Mapview';
import PredictiveAnalytics from './PredictiveAnalytics';
import ExportReports from './Exportreports';
import VehicleManagement from './VehicleManagement';

type Tab = 'overview' | 'trends' | 'map' | 'predictions' | 'export' | 'management';

export default function AnalyticsDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [efficiency, setEfficiency] = useState<any>(null);
    const [costBenefit, setCostBenefit] = useState<any>(null);
    const [alerts, setAlerts] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchAnalytics();
            const interval = setInterval(fetchAnalytics, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);
    
    const fetchAnalytics = async () => {
        try {
            const [effRes, costRes, alertRes] = await Promise.all([
                fetch('http://localhost:8000/api/analytics/route-efficiency'),
                fetch('http://localhost:8000/api/analytics/cost-benefit'),
                fetch('http://localhost:8000/api/alerts/real-time')
            ]);

            if (effRes.ok) setEfficiency(await effRes.json());
            if (costRes.ok) setCostBenefit(await costRes.json());
            if (alertRes.ok) setAlerts(await alertRes.json());

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex gap-2 overflow-x-auto">
                <TabButton
                    active={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="Overview"
                />
                <TabButton
                    active={activeTab === 'trends'}
                    onClick={() => setActiveTab('trends')}
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Trends"
                />
                <TabButton
                    active={activeTab === 'map'}
                    onClick={() => setActiveTab('map')}
                    icon={<Map className="w-4 h-4" />}
                    label="Live Map"
                />
                <TabButton
                    active={activeTab === 'predictions'}
                    onClick={() => setActiveTab('predictions')}
                    icon={<Brain className="w-4 h-4" />}
                    label="Predictions"
                    badge="AI"
                />
                <TabButton
                    active={activeTab === 'export'}
                    onClick={() => setActiveTab('export')}
                    icon={<Download className="w-4 h-4" />}
                    label="Export"
                />
                <TabButton
                    active={activeTab === 'management'}
                    onClick={() => setActiveTab('management')}
                    icon={<Settings className="w-4 h-4" />}
                    label="Management"
                />
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <OverviewTab 
                    loading={loading}
                    efficiency={efficiency}
                    costBenefit={costBenefit}
                    alerts={alerts}
                />
            )}

            {activeTab === 'trends' && <HistoricalTrends />}
            {activeTab === 'map' && <MapView />}
            {activeTab === 'predictions' && <PredictiveAnalytics />}
            {activeTab === 'export' && <ExportReports />}
            {activeTab === 'management' && <VehicleManagement />}
        </div>
    );
}

function TabButton({ active, onClick, icon, label, badge }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                active
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
        >
            {icon}
            {label}
            {badge && (
                <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded">
                    {badge}
                </span>
            )}
        </button>
    );
}

function OverviewTab({ loading, efficiency, costBenefit, alerts }: any) {
    if (loading) {
        return (
            <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Critical Alerts */}
            {alerts && alerts.summary && alerts.summary.critical > 0 && (
                <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <div>
                            <h2 className="text-2xl font-bold text-red-300">
                                🚨 {alerts.summary.critical} Critical Alert{alerts.summary.critical > 1 ? 's' : ''}
                            </h2>
                            <p className="text-red-400">Immediate action required</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {alerts.alerts.filter((a: any) => a.severity === 'CRITICAL').slice(0, 3).map((alert: any) => (
                            <div key={alert.id} className="bg-red-900/50 rounded p-3">
                                <div className="font-bold text-red-200">{alert.vehicle_id} - {alert.type.replace('_', ' ')}</div>
                                <div className="text-red-300 text-sm">{alert.message}</div>
                                <div className="text-red-400 text-sm mt-1">→ {alert.action}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ROI Summary */}
            {costBenefit && costBenefit.roi_metrics && (
                <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/50 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-6 h-6 text-green-400" />
                                <h2 className="text-2xl font-bold text-white">Business Impact</h2>
                            </div>
                            <p className="text-gray-300 mb-4">
                                {costBenefit.impact_assessment?.summary || 'Analyzing cost savings...'}
                            </p>
                            
                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs">ROI</div>
                                    <div className="text-green-400 text-2xl font-bold">
                                        {costBenefit.roi_metrics.roi_percentage}%
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs">Annual Savings</div>
                                    <div className="text-green-400 text-2xl font-bold">
                                        ${Math.round(costBenefit.net_savings.annual / 1000)}K
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs">Payback Period</div>
                                    <div className="text-blue-400 text-2xl font-bold">
                                        {costBenefit.roi_metrics.payback_period_months.toFixed(1)}mo
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs">Monthly Savings</div>
                                    <div className="text-green-400 text-2xl font-bold">
                                        ${Math.round(costBenefit.net_savings.monthly / 1000)}K
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Route Efficiency Scores */}
            {efficiency && efficiency.routes && efficiency.routes.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="w-6 h-6 text-purple-400" />
                        <h2 className="text-2xl font-bold text-white">Route Efficiency Scores</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-700/50 rounded-lg p-3">
                            <div className="text-gray-400 text-sm">System Average</div>
                            <div className="text-white text-3xl font-bold">
                                {efficiency.summary.avg_efficiency_score}
                                <span className="text-xl text-gray-400">/100</span>
                            </div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3">
                            <div className="text-gray-400 text-sm">Grade Distribution</div>
                            <div className="flex gap-2 mt-1">
                                {Object.entries(efficiency.summary.grade_distribution || {}).map(([grade, count]: [string, any]) => (
                                    <div key={grade} className="text-center">
                                        <div className={`font-bold ${
                                            grade === 'A' ? 'text-green-400' :
                                            grade === 'B' ? 'text-blue-400' :
                                            grade === 'C' ? 'text-yellow-400' :
                                            'text-red-400'
                                        }`}>{grade}</div>
                                        <div className="text-gray-400 text-sm">{count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {efficiency.routes.slice(0, 5).map((route: any) => (
                            <div key={route.route_id} className="bg-gray-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`text-3xl font-bold ${
                                            route.grade === 'A' ? 'text-green-400' :
                                            route.grade === 'B' ? 'text-blue-400' :
                                            route.grade === 'C' ? 'text-yellow-400' :
                                            route.grade === 'D' ? 'text-orange-400' :
                                            'text-red-400'
                                        }`}>
                                            {route.grade}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold">{route.route_name}</div>
                                            <div className="text-gray-400 text-sm">{route.route_id}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{route.efficiency_score}</div>
                                        <div className="text-gray-400 text-sm">Efficiency Score</div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <div>
                                        <div className="text-gray-400 text-xs">Occupancy</div>
                                        <div className="text-white font-bold">{route.avg_occupancy}%</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 text-xs">Avg Speed</div>
                                        <div className="text-white font-bold">{route.avg_speed} km/h</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 text-xs">Vehicles</div>
                                        <div className="text-white font-bold">{route.vehicle_count}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {efficiency && efficiency.recommendations && efficiency.recommendations.length > 0 && (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">AI-Powered Recommendations</h2>
                    </div>
                    <div className="space-y-3">
                        {efficiency.recommendations.slice(0, 5).map((rec: any, idx: number) => (
                            <div key={idx} className="bg-blue-900/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                                        rec.priority === 'CRITICAL' ? 'bg-red-500 text-white' :
                                        rec.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                                        'bg-yellow-500 text-black'
                                    }`}>
                                        {rec.priority}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold">{rec.route_name}</div>
                                        <div className="text-blue-200 text-sm mt-1">{rec.issue}</div>
                                        <div className="text-blue-300 text-sm mt-2">
                                            <span className="font-medium">→ Recommendation:</span> {rec.recommendation}
                                        </div>
                                        {rec.potential_impact && (
                                            <div className="text-green-400 text-sm mt-1">
                                                <span className="font-medium">💡 Impact:</span> {rec.potential_impact}
                                            </div>
                                        )}
                                        {rec.potential_savings && (
                                            <div className="text-green-400 text-sm mt-1">
                                                <span className="font-medium">💰 Savings:</span> {rec.potential_savings}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}