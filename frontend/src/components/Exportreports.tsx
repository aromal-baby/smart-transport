'use client'

import { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';

export default function ExportReports() {
    const [exporting, setExporting] = useState(false);
    const [exportType, setExportType] = useState<'pdf' | 'csv'>('pdf');

    const handleExport = async (type: 'analytics' | 'vehicles' | 'alerts') => {
        setExporting(true);

        try {
            const res = await fetch(`http://localhost:8000/api/export/${type}?format=${exportType}`);
            
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.${exportType}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert(`✅ ${type} report downloaded!`);
            } else {
                alert('❌ Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
                <Download className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Export Reports</h2>
            </div>

            {/* Format Selection */}
            <div className="mb-6">
                <label className="block text-gray-300 text-sm mb-2">Export Format</label>
                <div className="flex gap-3">
                    <button
                        onClick={() => setExportType('pdf')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            exportType === 'pdf'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        PDF Report
                    </button>
                    <button
                        onClick={() => setExportType('csv')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            exportType === 'csv'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                    >
                        <Table className="w-4 h-4" />
                        CSV Data
                    </button>
                </div>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
                <ExportCard
                    title="Analytics Report"
                    description="Complete analytics including efficiency scores, ROI, and recommendations"
                    icon={<FileText className="w-8 h-8 text-purple-400" />}
                    onExport={() => handleExport('analytics')}
                    disabled={exporting}
                />

                <ExportCard
                    title="Vehicle Performance"
                    description="Detailed vehicle-by-vehicle performance metrics and utilization"
                    icon={<FileText className="w-8 h-8 text-blue-400" />}
                    onExport={() => handleExport('vehicles')}
                    disabled={exporting}
                />

                <ExportCard
                    title="Alerts & Incidents"
                    description="All critical alerts, warnings, and incident reports"
                    icon={<FileText className="w-8 h-8 text-red-400" />}
                    onExport={() => handleExport('alerts')}
                    disabled={exporting}
                />
            </div>

            {exporting && (
                <div className="mt-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                        <span className="text-blue-300">Generating report...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function ExportCard({ title, description, icon, onExport, disabled }: any) {
    return (
        <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-4">
                <div className="bg-gray-800 rounded-lg p-3">
                    {icon}
                </div>
                <div>
                    <h3 className="text-white font-bold">{title}</h3>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>
            </div>

            <button
                onClick={onExport}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download className="w-4 h-4" />
                Export
            </button>
        </div>
    );
}