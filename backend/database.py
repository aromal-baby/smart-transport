import sqlite3
from datetime import datetime, timedelta
import os


class DatabaseManager:
    def __init__(self):
        # Creating database file in the backend folder
        db_path = os.path.join(os.path.dirname(__file__), 'transport.db')
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.create_table()
        print(f"✅ Connected to SQLite: {db_path}")


    def create_table(self):
        """Creating table if not exists"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                    CREATE TABLE IF NOT EXISTS bus_telemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    bus_id TEXT,
                    latitude REAL,
                    longitude REAL,
                    speed REAL,
                    passengers INTEGER,
                    vehicle_type TEXT,
                    route_id TEXT,
                    route_name TEXT,
                    status TEXT,
                    occupancy_percent REAL,
                    capacity INTEGER,
                    current_stop TEXT,
                    next_stop TEXT
                )
            """)
            self.conn.commit()
            print("✅ Table ready")
        except Exception as e:
            print(f"❌ {e}")

    
    def save_telemetry(self, vehicle_data):
        """Saving the vehicle telemetry"""
        try:
            cur = self.conn.cursor()
            cur.execute(
                """
                INSERT INTO bus_telemetry 
                (bus_id, latitude, longitude, speed, passengers, vehicle_type,
                 route_id, route_name, status, occupancy_percent, capacity, current_stop, next_stop)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                vehicle_data.get('bus_id'),
                vehicle_data.get('latitude'),
                vehicle_data.get('longitude'),
                vehicle_data.get('speed'),
                vehicle_data.get('passengers'),
                vehicle_data.get('vehicle_type', 'BUS'),
                vehicle_data.get('route_id'),
                vehicle_data.get('route_name'),
                vehicle_data.get('status'),
                vehicle_data.get('occupancy_percent'),
                vehicle_data.get('capacity', 50),
                vehicle_data.get('current_stop'),
                vehicle_data.get('next_stop')
            ))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"❌ Save error: {e}")
            return False
    

    def get_hourly_stats(self, hrs=24):
        """Getting the hourly statistics"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    strftime('%Y-%m-%d %H:00:00', time) as hour,
                    AVG(speed) as avg_speed,
                    AVG(passengers) as avg_passengers,
                    AVG(occupancy_percent) as avg_occupancy,
                    COUNT(DISTINCT bus_id) as vehicle_count,
                    COUNT(*) as data_points
                FROM bus_telemetry
                WHERE time > datetime('now', '-' || ? || ' hours')
                GROUP BY hour
                ORDER BY hour DESC
            """, (hrs,))
            
            results = cur.fetchall()
            return [
                {
                    'hour': row[0],
                    'avg_speed': round(row[1], 1) if row[1] else 0,
                    'avg_passengers': round(row[2], 1) if row[2] else 0,
                    'avg_occupancy': round(row[3], 1) if row[3] else 0,
                    'vehicle_count': row[4],
                    'data_points': row[5]
                }
                for row in results
            ]
        except Exception as e:
            print(f"❌ {e}")
            return []


    def get_route_performance(self):
        """Getting route performance"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    route_id,
                    route_name,
                    vehicle_type,
                    COUNT(*) as total_readings,
                    AVG(speed) as avg_speed,
                    AVG(passengers) as avg_passengers,
                    AVG(occupancy_percent) as avg_occupancy,
                    COUNT(DISTINCT bus_id) as vehicle_count,
                    MAX(occupancy_percent) as peak_occupancy,
                    SUM(CASE WHEN occupancy_percent > 80 THEN 1 ELSE 0 END) as overcrowded_instances
                FROM bus_telemetry
                WHERE time > datetime('now', '-24 hours')
                GROUP BY route_id, route_name, vehicle_type
                ORDER BY total_readings DESC
            """)
            
            results = cur.fetchall()
            return [
                {
                    'route_id': row[0],
                    'route_name': row[1],
                    'vehicle_type': row[2],
                    'total_readings': row[3],
                    'avg_speed': round(row[4], 1) if row[4] else 0,
                    'avg_passengers': round(row[5], 1) if row[5] else 0,
                    'avg_occupancy': round(row[6], 1) if row[6] else 0,
                    'vehicle_count': row[7],
                    'peak_occupancy': round(row[8], 1) if row[8] else 0,
                    'overcrowded_instances': row[9]
                }
                for row in results
            ]
        except Exception as e:
            print(f"❌ {e}")
            return []


    def get_system_summary(self):
        """Getting overall system summary"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(DISTINCT bus_id) as total_vehicles,
                    COUNT(DISTINCT route_id) as total_routes,
                    MIN(time) as earliest_data,
                    MAX(time) as latest_data,
                    AVG(occupancy_percent) as avg_system_occupancy
                FROM bus_telemetry
            """)
            
            row = cur.fetchone()
            if row:
                return {
                    'total_records': row[0],
                    'total_vehicles': row[1],
                    'total_routes': row[2],
                    'earliest_data': row[3],
                    'latest_data': row[4],
                    'avg_system_occupancy': round(row[5], 1) if row[5] else 0
                }
            return {}
        except Exception as e:
            print(f"❌ {e}")
            return {}
        

    
    def get_peak_analysis(self):
        """Analyzing peak hours"""
        if not self.conn:
            print("⚠️ No database connection")
            return {'hourly_pattern': [], 'peak_hours': []}

        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
                    AVG(occupancy_percent) as avg_occupancy,
                    AVG(passengers) as avg_passengers,
                    COUNT(*) as readings,
                    COUNT(DISTINCT bus_id) as active_vehicles
                FROM bus_telemetry
                WHERE time > datetime('now', '-7 days')
                GROUP BY hour_of_day
                ORDER BY hour_of_day
            """)

            # SQLite returns tuples, not dicts
            columns = [description[0] for description in cur.description]
            hourly = cur.fetchall()
            cur.close()


            if not hourly or len(hourly) == 0:
                    print("⚠️ No peak analysis data found in database")
                    return {'hourly_pattern': [], 'peak_hours': []}
                
            print(f"✅ Peak analysis: Found {len(hourly)} hours of data")

            # Converting tuples to dict
            hourly_dicts = [dict(zip(columns, row)) for row in hourly]    

            # Finding peak hours
            peak_hours = sorted(hourly_dicts, key=lambda x: float(x['avg_occupancy'] or 0), reverse=True)[:3]
            
                
            result = {
                'hourly_pattern': [
                    {
                        'hour': int(row['hour_of_day']),
                        'avg_occupancy': round(float(row['avg_occupancy']), 1) if row['avg_occupancy'] else 0,
                        'avg_passengers': round(float(row['avg_passengers']), 1) if row['avg_passengers'] else 0,
                        'active_vehicles': int(row['active_vehicles']),
                        'readings': int(row['readings'])  # ADD THIS for data_points
                    }
                    for row in hourly_dicts
                ],
                'peak_hours': [
                    {
                        'hour': int(row['hour_of_day']),
                        'avg_occupancy': round(float(row['avg_occupancy']), 1) if row['avg_occupancy'] else 0
                    }
                    for row in peak_hours
                ]
            }
                
            return result
                
        except Exception as e:
            print(f"❌ Failed to get peak analysis: {e}")
            import traceback
            traceback.print_exc()
            return {'hourly_pattern': [], 'peak_hours': []}
        
    

    def get_vehicle_efficiency(self):
        """Analyzing vehicle utilization"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    bus_id,
                    vehicle_type,
                    route_name,
                    AVG(occupancy_percent) as avg_utilization,
                    AVG(speed) as avg_speed,
                    COUNT(*) as data_points
                FROM bus_telemetry
                WHERE time > datetime('now', '-24 hours')
                GROUP BY bus_id, vehicle_type, route_name
                ORDER BY avg_utilization DESC
            """)
            
            results = cur.fetchall()
            
            underutilized = []
            optimal = []
            overcrowded = []
            
            for row in results:
                util = row[3] if row[3] else 0
                vehicle_data = {
                    'bus_id': row[0],
                    'vehicle_type': row[1],
                    'route_name': row[2],
                    'avg_utilization': round(util, 1),
                    'avg_speed': round(row[4], 1) if row[4] else 0,
                    'data_points': row[5]
                }
                
                if util < 40:
                    underutilized.append(vehicle_data)
                elif util > 85:
                    overcrowded.append(vehicle_data)
                else:
                    optimal.append(vehicle_data)
            
            return {
                'underutilized': underutilized,
                'optimal': optimal,
                'overcrowded': overcrowded,
                'summary': {
                    'total_vehicles': len(results),
                    'underutilized_count': len(underutilized),
                    'optimal_count': len(optimal),
                    'overcrowded_count': len(overcrowded)
                }
            }
        except Exception as e:
            print(f"❌ {e}")
            return {'underutilized': [], 'optimal': [], 'overcrowded': [], 'summary': {}}



    def get_stop_analysis(self):
        """Analyzing the stop performance"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    current_stop as stop_name,
                    COUNT(*) as stop_count,
                    AVG(passengers) as avg_boarding,
                    COUNT(DISTINCT bus_id) as vehicles_served
                FROM bus_telemetry
                WHERE status = 'AT_STOP' 
                    AND current_stop IS NOT NULL
                    AND time > datetime('now', '-24 hours')
                GROUP BY current_stop
                ORDER BY stop_count DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            return [
                {
                    'stop_name': row[0],
                    'stop_count': row[1],
                    'avg_boarding': round(row[2], 1) if row[2] else 0,
                    'vehicles_served': row[3]
                }
                for row in results
            ]
        except Exception as e:
            print(f"❌ {e}")
            return []
        
    

    def get_route_efficiency_scores(self):
        """Calculating the efficiency score for routes"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    route_id,
                    route_name,
                    vehicle_type,
                    AVG(occupancy_percent) as avg_occupancy,
                    AVG(speed) as avg_speed,
                    COUNT(*) as data_points,
                    COUNT(DISTINCT bus_id) as vehicle_count
                FROM bus_telemetry
                WHERE time > datetime('now', '-24 hours')
                GROUP BY route_id, route_name, vehicle_type
            """)
            
            results = cur.fetchall()
            scored_routes = []
            
            for row in results:
                avg_occ = row[3] if row[3] else 0
                avg_spd = row[4] if row[4] else 0
                speed_var = row[7] if row[7] else 0
                
                # Occupancy Score
                if 60 <= avg_occ <= 80:
                    occupancy_score = 100
                elif avg_occ < 60:
                    occupancy_score = (avg_occ / 60) * 100
                else:
                    occupancy_score = max(0, 100 - ((avg_occ - 80) * 2))
                
                # Speed Score
                speed_score = min((avg_spd / 50) * 100, 100)

                # Reliability Score (based on speed consistency)
                if speed_var > 0:
                    reliability_score = max(0, 100 - (speed_var * 2))
                else:
                    reliability_score = 100

                # Overall Efficiency
                efficiency_score = round((occupancy_score * 0.6) + (speed_score * 0.4) + (reliability_score * 0.2))
                
                # Assign grade
                if efficiency_score >= 90:
                    grade = 'A'
                elif efficiency_score >= 80:
                    grade = 'B'
                elif efficiency_score >= 70:
                    grade = 'C'
                elif efficiency_score >= 60:
                    grade = 'D'
                else:
                    grade = 'F'
                
                scored_routes.append({
                    'route_id': row[0],
                    'route_name': row[1],
                    'vehicle_type': row[2],
                    'avg_occupancy': round(avg_occ, 1),
                    'avg_speed': round(avg_spd, 1),
                    'vehicle_count': row[6],
                    'data_points': row[5],
                    'efficiency_score': efficiency_score,
                    'grade': grade,
                    'occupancy_score': round(occupancy_score, 1),
                    'speed_score': round(speed_score, 1)
                })
            
            scored_routes.sort(key=lambda x: x['efficiency_score'], reverse=True)
            return scored_routes
            
        except Exception as e:
            print(f"❌ {e}")
            return []



    def get_cost_benefit_analysis(self):
        """Calculating ROI and cost savings"""
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT 
                    COUNT(*) as total_data_points,
                    COUNT(DISTINCT bus_id) as total_vehicles,
                    AVG(occupancy_percent) as avg_system_occupancy,
                    AVG(speed) as avg_speed,
                    SUM(passengers) as total_passengers
                FROM bus_telemetry
                WHERE time > datetime('now', '-30 days')
            """)
            
            data = cur.fetchone()


            if not data or not data[0]:
                return {}

            
            tot_vehicles = data[1] if data[2] else 0
            avg_occ = data[2] if data[2] else 0
            tot_passengers = data[4] if data[4] else 0


            # Assuming cost 
            fuel_per_km = 0.50
            avg_km_per_day = 150
            driver_salary_month = 2500
            maintenance_month = 500


            # Monthly costs
            days_a_month = 30
            fuel_per_month = tot_vehicles * avg_km_per_day * days_a_month * fuel_per_km
            labor_monthly = tot_vehicles * driver_salary_month
            maintenance_monthly_cost = tot_vehicles * maintenance_month
            total_monthly_cost = fuel_per_month + labor_monthly + maintenance_monthly_cost

             # Savings from optimization
            route_optimization_savings = fuel_per_month * 0.08
            scheduling_savings = labor_monthly * 0.05
            maintenance_savings = maintenance_month * 0.10

            curr_efficiency = avg_occ / 100
            optimal_eff = 0.70
            if curr_efficiency < optimal_eff:
                potential_eff_gain = (optimal_eff - curr_efficiency) * fuel_per_month
            else:
                potential_eff_gain = 0

            
            tot_monthly_savings = (
                route_optimization_savings + 
                scheduling_savings +
                maintenance_savings +
                (potential_eff_gain * 0.5)
            )


            # System costs
            sys_implmentation_cost = 15000
            sys_monthly = 500


            # Net savings and ROI
            net_mnthly_sav = tot_monthly_savings - sys_monthly
            annual_sav = net_mnthly_sav * 12

            if net_mnthly_sav > 0:
                payback_mnths = sys_implmentation_cost / net_mnthly_sav
                roi_percent = (annual_sav / sys_implmentation_cost) * 100
            else:
                payback_mnths = 999
                roi_percent = 0

            break_even = (datetime.now() + timedelta(days=int(payback_mnths * 30))).strftime('%Y-%m-%d')

            return {
                'current_operations': {
                    'total_vehicles': tot_vehicles,
                    'avg_occupancy': round(avg_occ, 1),
                    'total_passengers_monthly': tot_passengers,
                    'monthly_operational_cost': round(total_monthly_cost, 2)
                },
                'cost_breakdown': {
                    'fuel_cost': round(fuel_per_month, 2),
                    'labor_cost': round(labor_monthly, 2),
                    'maintenance_cost': round(maintenance_monthly_cost, 2)
                },
                'savings_potential': {
                    'route_optimization': round(route_optimization_savings, 2),
                    'scheduling_efficiency': round(scheduling_savings, 2),
                    'predictive_maintenance': round(maintenance_savings, 2),
                    'occupancy_improvement': round(potential_eff_gain * 0.5, 2),
                    'total_monthly': round(tot_monthly_savings, 2),
                    'total_annual': round(tot_monthly_savings * 12, 2)
                },
                'system_costs': {
                    'implementation': sys_implmentation_cost,
                    'monthly_operational': sys_monthly,
                    'annual_operational': sys_monthly * 12
                },
                'net_savings': {
                    'monthly': round(net_mnthly_sav, 2),
                    'annual': round(annual_sav, 2)
                },
                'roi_metrics': {
                    'roi_percentage': round(roi_percent, 1),
                    'payback_period_months': round(payback_mnths, 1),
                    'payback_period_years': round(payback_mnths / 12, 2),
                    'break_even_date': break_even
                },
                'impact_assessment': {
                    'level': 'EXCELLENT' if roi_percent > 200 else 'GOOD',
                    'summary': f"Excellent ROI of {round(roi_percent, 1)}% with ${round(annual_sav):,} annual savings",
                    'key_benefits': [
                        f"Reduces fuel costs by 8% (${round(route_optimization_savings):,}/month)",
                        f"Improves labor efficiency by 5% (${round(scheduling_savings):,}/month)",
                        f"Reduces maintenance costs by 10% (${round(maintenance_savings):,}/month)",
                        f"System pays for itself in {round(payback_mnths, 1)} months"
                    ]
                }
            }
            
        except Exception as e:
            print(f"❌ {e}")
            return {}



    def initialize_database(slef):
        """Compatibility function"""
        return True

    
    def close(self):
        if self.conn:
            self.conn.close()
            print("🛑 Database closed")


