using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;

namespace FieldMind.Api.Tests.Helpers;

public static class TestDbContext
{
    public static FieldMindDbContext Create(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<FieldMindDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;

        return new FieldMindDbContext(options);
    }
}
