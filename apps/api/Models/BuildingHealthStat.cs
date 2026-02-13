using System;

namespace FieldMind.Api.Models;

public enum HealthMetricType
{
    RoofIntegrity,
    HailExposure,
    WaterRisk,
    StructuralRisk
}

public enum MetricSource
{
    AI,
    ExternalIntegration,
    Manual
}

public class BuildingHealthStat
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string BuildingId { get; set; } = string.Empty;
    public Building Building { get; set; } = null!;

    public HealthMetricType MetricType { get; set; }
    public double Value { get; set; }
    public MetricSource Source { get; set; } = MetricSource.AI;

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
