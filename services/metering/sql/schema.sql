-- Create hypertable for usage telemetry
CREATE TABLE IF NOT EXISTS usage_telemetry (
    time TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    consumption DOUBLE PRECISION DEFAULT 0,
    generation DOUBLE PRECISION DEFAULT 0,
    storage DOUBLE PRECISION DEFAULT 0
);

-- Turn into a hypertable
SELECT create_hypertable('usage_telemetry', 'time', if_not_exists => TRUE);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_user_id_time ON usage_telemetry (user_id, time DESC);
