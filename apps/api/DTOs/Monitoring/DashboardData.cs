namespace FieldMind.Api.DTOs.Monitoring;

public class DashboardData
{
    public ApiMetricsSummary ApiMetrics { get; set; } = new();
    public List<ErrorSummary> RecentErrors { get; set; } = new();
    public List<AlertInstance> ActiveAlerts { get; set; } = new();
    public SystemHealthSummary SystemHealth { get; set; } = new();
}

public class ApiMetricsSummary
{
    public int TotalRequests { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public double ErrorRate { get; set; }
    public List<EndpointStats> SlowestEndpoints { get; set; } = new();
}

public class EndpointStats
{
    public string Endpoint { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public int RequestCount { get; set; }
    public double AverageDurationMs { get; set; }
    public double ErrorRate { get; set; }
}

public class ErrorSummary
{
    public Guid Id { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ErrorType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public int OccurrenceCount { get; set; }
}

public class SystemHealthSummary
{
    public bool DatabaseHealthy { get; set; }
    public bool HangfireHealthy { get; set; }
    public int PendingJobs { get; set; }
    public int FailedJobs { get; set; }
}
