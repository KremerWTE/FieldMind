using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FieldMind.Api.Migrations;

/// <inheritdoc />
public partial class AddPropTraxIntegration : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PropTraxApiKey",
            table: "Teams",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "PropTraxWebhookUrl",
            table: "Teams",
            type: "text",
            nullable: true);

        // Index on PropTraxApiKey for fast lookup on every API call
        migrationBuilder.CreateIndex(
            name: "IX_Teams_PropTraxApiKey",
            table: "Teams",
            column: "PropTraxApiKey",
            unique: true,
            filter: "\"PropTraxApiKey\" IS NOT NULL");

        // Index on Building.PropTraxBuildingId for fast lookup
        migrationBuilder.CreateIndex(
            name: "IX_Buildings_PropTraxBuildingId",
            table: "Buildings",
            column: "PropTraxBuildingId");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Buildings_PropTraxBuildingId",
            table: "Buildings");

        migrationBuilder.DropIndex(
            name: "IX_Teams_PropTraxApiKey",
            table: "Teams");

        migrationBuilder.DropColumn(
            name: "PropTraxWebhookUrl",
            table: "Teams");

        migrationBuilder.DropColumn(
            name: "PropTraxApiKey",
            table: "Teams");
    }
}
