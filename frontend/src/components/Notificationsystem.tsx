'use client'

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
}

export default function NotificationSystem() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Poll for critical alerts
        const interval = setInterval(checkAlerts, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const checkAlerts = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/alerts/real-time');
            if (res.ok) {
                const data = await res.json();
                
                // Show notification for new critical alerts
                if (data.summary.critical > 0) {
                    const criticalAlerts = data.alerts.filter((a: any) => a.severity === 'CRITICAL');
                    
                    criticalAlerts.slice(0, 1).forEach((alert: any) => {
                        addNotification({
                            type: 'error',
                            title: 'Critical Alert',
                            message: `${alert.vehicle_id}: ${alert.message}`
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Failed to check alerts');
        }
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const newNotif: Notification = {
            ...notification,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now()
        };

        setNotifications(prev => [...prev, newNotif]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeNotification(newNotif.id);
        }, 5000);
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
            {notifications.map((notification) => (
                <NotificationToast
                    key={notification.id}
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>
    );
}

function NotificationToast({ notification, onClose }: { notification: Notification; onClose: () => void }) {
    const config = {
        success: {
            icon: <CheckCircle className="w-5 h-5" />,
            bgColor: 'bg-green-900/90',
            borderColor: 'border-green-500',
            textColor: 'text-green-200'
        },
        error: {
            icon: <AlertCircle className="w-5 h-5" />,
            bgColor: 'bg-red-900/90',
            borderColor: 'border-red-500',
            textColor: 'text-red-200'
        },
        warning: {
            icon: <AlertTriangle className="w-5 h-5" />,
            bgColor: 'bg-yellow-900/90',
            borderColor: 'border-yellow-500',
            textColor: 'text-yellow-200'
        },
        info: {
            icon: <Info className="w-5 h-5" />,
            bgColor: 'bg-blue-900/90',
            borderColor: 'border-blue-500',
            textColor: 'text-blue-200'
        }
    };

    const style = config[notification.type];

    return (
        <div 
            className={`${style.bgColor} ${style.textColor} border-2 ${style.borderColor} rounded-lg p-4 shadow-2xl backdrop-blur animate-slide-in-right`}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5">
                    {style.icon}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold mb-1">{notification.title}</h4>
                    <p className="text-sm opacity-90">{notification.message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="hover:bg-white/10 rounded p-1 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

