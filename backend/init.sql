-- Initialize database and create tables
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create bus telemetry table
CREATE TABLE IF NOT EXISTS bus_telemetry (
    time TIMESTAMPTZ NOT NULL,
    bus_id TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed INTEGER,
    passengers INTEGER
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('bus_telemetry', 'time', if_not_exists => TRUE);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bus_id_time ON bus_telemetry (bus_id, time DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE bus_telemetry TO postgres;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database initialized successfully!';
    RAISE NOTICE '✅ Table bus_telemetry created';
    RAISE NOTICE '✅ Hypertable enabled for time-series data';
END $$;