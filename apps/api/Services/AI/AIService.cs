namespace FieldMind.Api.Services.AI;

public class AIService
{
    private readonly IVisionAnnotator _annotator;
    private readonly ILogger<AIService> _logger;

    public AIService(
        IConfiguration configuration,
        IServiceProvider serviceProvider,
        ILogger<AIService> logger)
    {
        _logger = logger;

        var provider = configuration["AI:Provider"] ?? "mock";

        _annotator = provider.ToLower() switch
        {
            "openai" => serviceProvider.GetRequiredService<OpenAIVisionAnnotator>(),
            "mock" => serviceProvider.GetRequiredService<MockVisionAnnotator>(),
            _ => serviceProvider.GetRequiredService<MockVisionAnnotator>()
        };

        _logger.LogInformation("AI Service initialized with provider: {Provider}", provider);
    }

    public Task<VisionAnnotationOutput> AnalyzePhotoAsync(VisionAnnotationInput input)
    {
        return _annotator.AnnotateAsync(input);
    }
}
