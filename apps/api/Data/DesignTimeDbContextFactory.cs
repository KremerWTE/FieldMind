using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FieldMind.Api.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<FieldMindDbContext>
{
    public FieldMindDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<FieldMindDbContext>();
        optionsBuilder.UseSqlite("Data Source=fieldmind.db");

        return new FieldMindDbContext(optionsBuilder.Options);
    }
}
