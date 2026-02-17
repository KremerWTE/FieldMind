using FieldMind.Api.Data;
using FieldMind.Api.DTOs.Monitoring;
using Microsoft.EntityFrameworkCore;

namespace FieldMind.Api.Services;

public class AlertingService
{
    private readonly FieldMindDbContext _context;
    private readonly EmailService _emailService;
    private readonly ILogger<AlertingService> _logger;
    private readonly IConfiguration _configuration;

    public AlertingService(
        FieldMindDbContext context,
        EmailService emailService,
        ILogger<AlertingService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task EvaluateAllRules()
    {
        try
        {
            var rules = await _context.Database
                .SqlQuery<AlertRuleDb>($@"SELECT * FROM monitoring.alert_rules WHERE enabled = true")
                .ToListAsync();

            _logger.LogInformation("Evaluating {Count} alert rules", rules.Count);

            foreach (var rule in rules)
            {
                await EvaluateRule(rule);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate alert rules");
        }
    }

    private async Task EvaluateRule(AlertRuleDb rule)
    {
        try
        {
            // Execute the rule's query
            var result = await ExecuteAlertQuery(rule.Query);

            var isViolating = result > rule.Threshold;

            var existingAlert = await GetActiveAlert(rule.Id);

            if (isViolating && existingAlert == null)
            {
                // Check throttling - don't create alert if one was recently resolved
                var recentlyResolved = await WasRecentlyResolved(rule.Id, rule.ThrottleMinutes);
                if (recentlyResolved)
                {
                    _logger.LogInformation("Alert {RuleId} throttled - recently resolved", rule.Id);
                    return;
                }

                // Trigger new alert
                var alert = new AlertInstance
                {
                    Id = Guid.NewGuid(),
                    RuleId = rule.Id,
                    Status = "firing",
                    TriggeredAt = DateTime.UtcNow,
                    Value = result,
                    Message = $"{rule.Name}: {result:F2} exceeds threshold {rule.Threshold}"
                };

                await CreateAlert(alert);
                await SendNotifications(rule, alert);

                _logger.LogWarning("Alert triggered: {AlertId} - {Message}", alert.Id, alert.Message);
            }
            else if (!isViolating && existingAlert != null)
            {
                // Resolve existing alert
                await ResolveAlert(existingAlert.Id);
                _logger.LogInformation("Alert resolved: {AlertId}", existingAlert.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate alert rule {RuleId}", rule.Id);
        }
    }

    private async Task<double> ExecuteAlertQuery(string query)
    {
        try
        {
            var result = await _context.Database
                .SqlQueryRaw<double>(query)
                .FirstOrDefaultAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute alert query: {Query}", query);
            return 0;
        }
    }

    private async Task<AlertInstance?> GetActiveAlert(string ruleId)
    {
        return await _context.Database
            .SqlQuery<AlertInstance>($@"
                SELECT
                    id as Id,
                    rule_id as RuleId,
                    status as Status,
                    triggered_at as TriggeredAt,
                    resolved_at as ResolvedAt,
                    value as Value,
                    message as Message
                FROM monitoring.alert_instances
                WHERE rule_id = {ruleId} AND status = 'firing'
                ORDER BY triggered_at DESC
                LIMIT 1
            ")
            .FirstOrDefaultAsync();
    }

    private async Task<bool> WasRecentlyResolved(string ruleId, int throttleMinutes)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-throttleMinutes);

        var count = await _context.Database
            .SqlQueryRaw<int>($@"
                SELECT COUNT(*)::int as Value
                FROM monitoring.alert_instances
                WHERE rule_id = @p0
                  AND status = 'resolved'
                  AND resolved_at > @p1
            ", ruleId, cutoff)
            .FirstOrDefaultAsync();

        return count > 0;
    }

    private async Task CreateAlert(AlertInstance alert)
    {
        await _context.Database.ExecuteSqlRawAsync(@"
            INSERT INTO monitoring.alert_instances
            (id, rule_id, status, triggered_at, value, message)
            VALUES (@p0, @p1, @p2, @p3, @p4, @p5)
        ", alert.Id, alert.RuleId, alert.Status, alert.TriggeredAt, alert.Value, alert.Message);
    }

    private async Task ResolveAlert(Guid alertId)
    {
        await _context.Database.ExecuteSqlRawAsync(@"
            UPDATE monitoring.alert_instances
            SET status = 'resolved', resolved_at = @p1
            WHERE id = @p0
        ", alertId, DateTime.UtcNow);
    }

    private async Task SendNotifications(AlertRuleDb rule, AlertInstance alert)
    {
        var channels = rule.NotificationChannels ?? Array.Empty<string>();
        var sentChannels = new List<string>();

        foreach (var channel in channels)
        {
            try
            {
                switch (channel.ToLower())
                {
                    case "email":
                        await SendEmailNotification(rule, alert);
                        sentChannels.Add("email");
                        break;
                    case "slack":
                        await SendSlackNotification(rule, alert);
                        sentChannels.Add("slack");
                        break;
                    case "webhook":
                        await SendWebhookNotification(rule, alert);
                        sentChannels.Add("webhook");
                        break;
                    default:
                        _logger.LogWarning("Unknown notification channel: {Channel}", channel);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send notification via {Channel}", channel);
            }
        }

        // Update alert with notified channels
        if (sentChannels.Any())
        {
            await _context.Database.ExecuteSqlRawAsync(@"
                UPDATE monitoring.alert_instances
                SET notified_channels = @p1
                WHERE id = @p0
            ", alert.Id, sentChannels.ToArray());
        }
    }

    private async Task SendEmailNotification(AlertRuleDb rule, AlertInstance alert)
    {
        var emailEnabled = _configuration.GetValue<bool>("Email:Enabled", false);
        if (!emailEnabled)
        {
            _logger.LogWarning("Email notifications disabled, skipping alert email");
            return;
        }

        var subject = $"[{rule.Severity.ToUpper()}] FieldMind Alert: {rule.Name}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <h2 style='color: {GetSeverityColor(rule.Severity)};'>Alert: {rule.Name}</h2>
                <p><strong>Severity:</strong> <span style='color: {GetSeverityColor(rule.Severity)};'>{rule.Severity.ToUpper()}</span></p>
                <p><strong>Description:</strong> {rule.Description ?? "N/A"}</p>
                <p><strong>Message:</strong> {alert.Message}</p>
                <p><strong>Current Value:</strong> {alert.Value:F2}</p>
                <p><strong>Threshold:</strong> {rule.Threshold}</p>
                <p><strong>Triggered At:</strong> {alert.TriggeredAt:yyyy-MM-dd HH:mm:ss} UTC</p>
                <hr/>
                <p><a href='http://localhost:3002/d/alerts' style='background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>View in Grafana</a></p>
                <p style='color: #666; font-size: 12px; margin-top: 20px;'>This is an automated alert from FieldMind monitoring system.</p>
            </body>
            </html>
        ";

        // Send to ops email (would be configurable in production)
        var toEmail = _configuration["Monitoring:AlertEmail"] ?? "ops@proptrax.com";
        await _emailService.SendEmailAsync(toEmail, "Operations Team", subject, body);
    }

    private async Task SendSlackNotification(AlertRuleDb rule, AlertInstance alert)
    {
        var webhookUrl = _configuration["Monitoring:SlackWebhook"];
        if (string.IsNullOrEmpty(webhookUrl))
        {
            _logger.LogWarning("Slack webhook not configured, skipping alert");
            return;
        }

        var color = rule.Severity switch
        {
            "critical" => "danger",
            "warning" => "warning",
            _ => "good"
        };

        var payload = new
        {
            attachments = new[]
            {
                new
                {
                    color,
                    title = $"[{rule.Severity.ToUpper()}] {rule.Name}",
                    text = alert.Message,
                    fields = new[]
                    {
                        new { title = "Value", value = alert.Value.ToString("F2"), @short = true },
                        new { title = "Threshold", value = rule.Threshold.ToString("F2"), @short = true },
                        new { title = "Time", value = alert.TriggeredAt.ToString("yyyy-MM-dd HH:mm:ss UTC"), @short = false }
                    },
                    footer = "FieldMind Monitoring",
                    ts = new DateTimeOffset(alert.TriggeredAt).ToUnixTimeSeconds()
                }
            }
        };

        using var httpClient = new HttpClient();
        var response = await httpClient.PostAsJsonAsync(webhookUrl, payload);
        response.EnsureSuccessStatusCode();
    }

    private async Task SendWebhookNotification(AlertRuleDb rule, AlertInstance alert)
    {
        var webhookUrl = _configuration["Monitoring:WebhookUrl"];
        if (string.IsNullOrEmpty(webhookUrl))
        {
            _logger.LogWarning("Webhook URL not configured, skipping alert");
            return;
        }

        var payload = new
        {
            alertId = alert.Id,
            ruleId = rule.Id,
            ruleName = rule.Name,
            severity = rule.Severity,
            status = alert.Status,
            value = alert.Value,
            threshold = rule.Threshold,
            message = alert.Message,
            triggeredAt = alert.TriggeredAt
        };

        using var httpClient = new HttpClient();
        var response = await httpClient.PostAsJsonAsync(webhookUrl, payload);
        response.EnsureSuccessStatusCode();
    }

    private string GetSeverityColor(string severity)
    {
        return severity.ToLower() switch
        {
            "critical" => "#dc3545",
            "warning" => "#ffc107",
            "info" => "#17a2b8",
            _ => "#6c757d"
        };
    }
}

// Database model for alert rules
internal class AlertRuleDb
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Enabled { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public double Threshold { get; set; }
    public int EvaluationIntervalSeconds { get; set; }
    public string[]? NotificationChannels { get; set; }
    public int ThrottleMinutes { get; set; }
}
