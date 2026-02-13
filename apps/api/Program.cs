using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Hangfire;
using Hangfire.PostgreSql;
using FieldMind.Api.Data;
using FieldMind.Api.Services;
using FieldMind.Api.Services.AI;
using FieldMind.Api.Jobs;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<FieldMindDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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

// Hangfire
builder.Services.AddHangfire(config =>
{
    config.UsePostgreSqlStorage(options =>
    {
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"));
    });
});
builder.Services.AddHangfireServer();

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FieldMind API V1");
        c.RoutePrefix = "api-docs";
    });
}

app.UseCors("AllowFrontend");

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

Console.WriteLine("🚀 FieldMind API (.NET 10) running");
Console.WriteLine($"📚 API Documentation: {app.Urls.FirstOrDefault()}/api-docs");
if (app.Environment.IsDevelopment())
{
    Console.WriteLine($"🔧 Hangfire Dashboard: {app.Urls.FirstOrDefault()}/hangfire");
}
Console.WriteLine($"🤖 AI Provider: {builder.Configuration["AI:Provider"] ?? "mock"}");

app.Run();

// Simple auth filter for Hangfire dashboard in dev
public class HangfireAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context) => true; // Allow all in dev
}
