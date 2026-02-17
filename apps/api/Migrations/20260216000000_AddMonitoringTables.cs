using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FieldMind.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMonitoringTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enable TimescaleDB extension
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;");

            // Create monitoring schema
            migrationBuilder.Sql("CREATE SCHEMA IF NOT EXISTS monitoring;");

            // System metrics (hypertable for time-series)
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.system_metrics (
                    time TIMESTAMPTZ NOT NULL,
                    metric_name TEXT NOT NULL,
                    value DOUBLE PRECISION NOT NULL,
                    tags JSONB,
                    PRIMARY KEY (time, metric_name)
                );
            ");
            migrationBuilder.Sql("SELECT create_hypertable('monitoring.system_metrics', 'time');");

            // API request metrics
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.api_metrics (
                    time TIMESTAMPTZ NOT NULL,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    status_code INTEGER,
                    duration_ms INTEGER,
                    user_id TEXT,
                    team_id UUID,
                    error_message TEXT,
                    PRIMARY KEY (time, endpoint, method, user_id)
                );
            ");
            migrationBuilder.Sql("SELECT create_hypertable('monitoring.api_metrics', 'time');");

            // Background job metrics
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.job_metrics (
                    time TIMESTAMPTZ NOT NULL,
                    job_type TEXT NOT NULL,
                    job_id TEXT,
                    status TEXT,
                    duration_ms INTEGER,
                    error_message TEXT,
                    metadata JSONB,
                    PRIMARY KEY (time, job_type, job_id)
                );
            ");
            migrationBuilder.Sql("SELECT create_hypertable('monitoring.job_metrics', 'time');");

            // Error logs (from web/mobile)
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.error_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    platform TEXT NOT NULL,
                    error_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    stack_trace TEXT,
                    severity TEXT NOT NULL,
                    user_id TEXT,
                    team_id UUID,
                    session_id TEXT,
                    device_info JSONB,
                    breadcrumbs JSONB,
                    context JSONB,
                    occurred_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ");
            migrationBuilder.Sql("CREATE INDEX idx_error_logs_time ON monitoring.error_logs (occurred_at DESC);");
            migrationBuilder.Sql("CREATE INDEX idx_error_logs_severity ON monitoring.error_logs (severity, occurred_at DESC);");

            // Performance metrics (from web/mobile)
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.performance_metrics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    platform TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    duration_ms DOUBLE PRECISION NOT NULL,
                    user_id TEXT,
                    team_id UUID,
                    metadata JSONB,
                    measured_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ");
            migrationBuilder.Sql("CREATE INDEX idx_perf_metrics_time ON monitoring.performance_metrics (measured_at DESC);");

            // Alert rules
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.alert_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    enabled BOOLEAN DEFAULT true,
                    severity TEXT NOT NULL,
                    query TEXT NOT NULL,
                    threshold DOUBLE PRECISION NOT NULL,
                    evaluation_interval_seconds INTEGER DEFAULT 60,
                    notification_channels TEXT[],
                    throttle_minutes INTEGER DEFAULT 15,
                    metadata JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ");

            // Alert instances
            migrationBuilder.Sql(@"
                CREATE TABLE monitoring.alert_instances (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    rule_id TEXT REFERENCES monitoring.alert_rules(id),
                    status TEXT NOT NULL,
                    triggered_at TIMESTAMPTZ NOT NULL,
                    resolved_at TIMESTAMPTZ,
                    value DOUBLE PRECISION,
                    message TEXT,
                    notified_channels TEXT[],
                    acknowledged_by TEXT,
                    acknowledged_at TIMESTAMPTZ
                );
            ");
            migrationBuilder.Sql("CREATE INDEX idx_alert_instances_status ON monitoring.alert_instances (status, triggered_at DESC);");

            // Retention policies (keep raw metrics 30 days)
            migrationBuilder.Sql("SELECT add_retention_policy('monitoring.system_metrics', INTERVAL '30 days');");
            migrationBuilder.Sql("SELECT add_retention_policy('monitoring.api_metrics', INTERVAL '30 days');");
            migrationBuilder.Sql("SELECT add_retention_policy('monitoring.job_metrics', INTERVAL '30 days');");

            // Compression policies (compress data older than 7 days)
            migrationBuilder.Sql(@"
                ALTER TABLE monitoring.system_metrics SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'metric_name'
                );
            ");
            migrationBuilder.Sql("SELECT add_compression_policy('monitoring.system_metrics', INTERVAL '7 days');");

            migrationBuilder.Sql(@"
                ALTER TABLE monitoring.api_metrics SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'endpoint,method'
                );
            ");
            migrationBuilder.Sql("SELECT add_compression_policy('monitoring.api_metrics', INTERVAL '7 days');");

            migrationBuilder.Sql(@"
                ALTER TABLE monitoring.job_metrics SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'job_type'
                );
            ");
            migrationBuilder.Sql("SELECT add_compression_policy('monitoring.job_metrics', INTERVAL '7 days');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SCHEMA IF EXISTS monitoring CASCADE;");
        }
    }
}
