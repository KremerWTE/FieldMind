using FieldMind.Api.Services;

namespace FieldMind.Api.BackgroundServices;

public class AlertEvaluationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AlertEvaluationService> _logger;
    private const int EvaluationIntervalSeconds = 60;

    public AlertEvaluationService(
        IServiceProvider serviceProvider,
        ILogger<AlertEvaluationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Alert Evaluation Service started");

        // Wait a bit before starting to allow the app to fully initialize
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var alertService = scope.ServiceProvider.GetRequiredService<AlertingService>();

                _logger.LogDebug("Evaluating alert rules...");
                await alertService.EvaluateAllRules();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating alert rules");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(EvaluationIntervalSeconds), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                // Expected when stopping
                break;
            }
        }

        _logger.LogInformation("Alert Evaluation Service stopped");
    }
}
