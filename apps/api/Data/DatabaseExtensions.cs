using Microsoft.EntityFrameworkCore;

namespace FieldMind.Api.Data;

public static class DatabaseExtensions
{
    public static async Task<IApplicationBuilder> UseDatabaseSeeding(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var services = scope.ServiceProvider;

        try
        {
            var context = services.GetRequiredService<FieldMindDbContext>();
            var logger = services.GetRequiredService<ILogger<DbSeeder>>();

            // Ensure database is created and migrations are applied
            await context.Database.MigrateAsync();
            logger.LogInformation("✅ Database migrations applied successfully");

            // Seed data
            var seeder = new DbSeeder(context, logger);
            await seeder.SeedAsync();
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "❌ An error occurred while migrating or seeding the database");
            throw;
        }

        return app;
    }
}
