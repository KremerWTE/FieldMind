using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FieldMind.Api.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<FieldMindDbContext>
{
    public FieldMindDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<FieldMindDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=fieldmind;Username=postgres;Password=postgres");

        return new FieldMindDbContext(optionsBuilder.Options);
    }
}
