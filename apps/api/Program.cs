using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Hangfire;
using Hangfire.InMemory;
using FieldMind.Api.Data;
using FieldMind.Api.Services;
using FieldMind.Api.Services.AI;
using FieldMind.Api.Jobs;
using FieldMind.Api.Middleware;
using FieldMind.Api.BackgroundServices;
using Serilog;
using Serilog.Exceptions;

// Configure Serilog BEFORE building the host
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .Enrich.WithExceptionDetails()
    .WriteTo.Console()
    .WriteTo.File("logs/fieldmind-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7)
    .CreateLogger();

try
{
    Log.Information("Starting FieldMind API");

var builder = WebApplication.CreateBuilder(args);

// Use Serilog for logging
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .Enrich.WithExceptionDetails()
    .WriteTo.Console()
    .WriteTo.File("logs/fieldmind-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7)
    .WriteTo.Seq(context.Configuration["Serilog:SeqUrl"] ?? "http://localhost:5341"));

// Database
builder.Services.AddDbContext<FieldMindDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication & JWT
var jwtSecret = builder.Configuration["JWT:Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(builder.Configuration["Frontend:Url"] ?? "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BuildingsService>();
builder.Services.AddScoped<ProjectsService>();
builder.Services.AddScoped<PhotosService>();
builder.Services.AddScoped<SearchService>();
builder.Services.AddScoped<ShareService>();
builder.Services.AddSingleton<FeaturesService>();
builder.Services.AddSingleton<CompanyService>();
builder.Services.AddSingleton<S3StorageService>();

// AI Services
builder.Services.AddScoped<MockVisionAnnotator>();
builder.Services.AddHttpClient<OpenAIVisionAnnotator>();
builder.Services.AddScoped<AIService>();

// Background Jobs
builder.Services.AddScoped<PhotoAIAnalysisJob>();
builder.Services.AddScoped<GenerateReportJob>();

// PDF Service
builder.Services.AddScoped<PDFReportService>();

// Email Service
builder.Services.AddSingleton<EmailService>();

// SMS Service (Twilio via HttpClient)
builder.Services.AddHttpClient<SmsService>();

// PropTrax Integration
builder.Services.AddHttpClient("proptrax-webhook");
builder.Services.AddScoped<PropTraxWebhookService>();

// Monitoring Services
builder.Services.AddScoped<MonitoringService>();
builder.Services.AddScoped<AlertingService>();

// User Management Services
builder.Services.AddScoped<UserManagementService>();

// Background Services
builder.Services.AddHostedService<AlertEvaluationService>();

// Hangfire
builder.Services.AddHangfire(config =>
{
    config.UseInMemoryStorage();
});
builder.Services.AddHangfireServer();

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Health Checks
builder.Services.AddHealthChecks()
    .AddCheck<HangfireHealthCheck>("hangfire", tags: new[] { "ready" });

// OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// Run EF migrations on startup (always — safe to run on already-migrated DB)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FieldMindDbContext>();
    await db.Database.MigrateAsync();
}

// Seed database in development
if (app.Environment.IsDevelopment())
{
    await app.UseDatabaseSeeding();
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

// Metrics middleware - track all API requests
app.UseMiddleware<MetricsMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// Hangfire Dashboard (dev only)
if (app.Environment.IsDevelopment())
{
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireAuthorizationFilter() }
    });
}

app.MapControllers();

// Health check endpoints
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = System.Text.Json.JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            }),
            totalDuration = report.TotalDuration.TotalMilliseconds
        });
        await context.Response.WriteAsync(result);
    }
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // Just returns 200 if app is running
});

Console.WriteLine("🚀 FieldMind API (.NET 10) running");
Console.WriteLine($"📚 API Documentation: {app.Urls.FirstOrDefault()}/openapi/v1.json");
if (app.Environment.IsDevelopment())
{
    Console.WriteLine($"🔧 Hangfire Dashboard: {app.Urls.FirstOrDefault()}/hangfire");
    Console.WriteLine($"📊 Seq Logs: http://localhost:5341");
    Console.WriteLine($"📈 Grafana: http://localhost:3002");
}
Console.WriteLine($"🤖 AI Provider: {builder.Configuration["AI:Provider"] ?? "mock"}");

app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Simple auth filter for Hangfire dashboard in dev
public class HangfireAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context) => true; // Allow all in dev
}
