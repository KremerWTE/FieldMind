using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FieldMind.Api.Services.AI;

public class OpenAIVisionAnnotator : IVisionAnnotator
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly ILogger<OpenAIVisionAnnotator> _logger;

    public OpenAIVisionAnnotator(
        IConfiguration configuration,
        ILogger<OpenAIVisionAnnotator> logger,
        HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _apiKey = configuration["AI:OpenAI:ApiKey"] ?? throw new InvalidOperationException("OpenAI API key not configured");
        _model = configuration["AI:OpenAI:Model"] ?? "gpt-4o";

        var baseUrl = configuration["AI:OpenAI:BaseUrl"] ?? "https://api.openai.com/v1";
        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
    }

    public async Task<VisionAnnotationOutput> AnnotateAsync(VisionAnnotationInput input)
    {
        try
        {
            var systemPrompt = @"You are an expert construction inspector analyzing job site photos.

Analyze this photo and return ONLY valid JSON with this exact structure:
{
  ""shortDescription"": ""1-2 sentence summary"",
  ""fullDescription"": ""5-10 sentence technical analysis including materials, condition, concerns"",
  ""tags"": [""keyword1"", ""keyword2""],
  ""categories"": [""roof"", ""exterior"", ""damage""],
  ""detectedIssues"": [
    {
      ""type"": ""hail damage"",
      ""severity"": ""medium"",
      ""confidence"": 0.87,
      ""description"": ""Multiple impact marks on shingles""
    }
  ],
  ""estimatedRepairPriority"": ""medium"",
  ""structuralImpactScore"": 65
}

Severity levels: low (cosmetic), medium (monitor), high (repair soon), critical (immediate action)
Confidence: 0-1 (how certain you are)
StructuralImpactScore: 0-100 (0=no concern, 100=structural failure)
Categories: roof, exterior, interior, foundation, damage, moisture, structural, hail, water-intrusion, etc.";

            var request = new
            {
                model = _model,
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "text", text = "Analyze this construction/building photo:" },
                            new { type = "image_url", image_url = new { url = input.ImageUrl } }
                        }
                    }
                },
                max_tokens = 1000,
                temperature = 0.7
            };

            var response = await _httpClient.PostAsJsonAsync("/chat/completions", request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OpenAIResponse>();
            var content = result?.Choices?.FirstOrDefault()?.Message?.Content ?? "";

            _logger.LogInformation("OpenAI response for photo {PhotoId}: {Content}", input.PhotoId, content);

            // Parse the JSON response
            var output = JsonSerializer.Deserialize<VisionAnnotationOutput>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return output ?? throw new InvalidOperationException("Failed to parse AI response");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling OpenAI Vision API for photo {PhotoId}", input.PhotoId);
            throw;
        }
    }

    private class OpenAIResponse
    {
        [JsonPropertyName("choices")]
        public List<Choice>? Choices { get; set; }
    }

    private class Choice
    {
        [JsonPropertyName("message")]
        public Message? Message { get; set; }
    }

    private class Message
    {
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }
}
