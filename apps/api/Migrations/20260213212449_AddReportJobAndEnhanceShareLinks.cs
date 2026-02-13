using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FieldMind.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReportJobAndEnhanceShareLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedById",
                table: "ShareLinks",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ShareLinks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastAccessedAt",
                table: "ShareLinks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TeamId",
                table: "ShareLinks",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "ShareLinks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "ShareLinks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ReportJobs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    TeamId = table.Column<string>(type: "text", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    EntityId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    S3Key = table.Column<string>(type: "text", nullable: true),
                    S3Url = table.Column<string>(type: "text", nullable: true),
                    DownloadUrl = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IncludeAI = table.Column<bool>(type: "boolean", nullable: false),
                    IncludeMaintenanceEvents = table.Column<bool>(type: "boolean", nullable: false),
                    IncludeHealthStats = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportJobs_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinks_CreatedById",
                table: "ShareLinks",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ReportJobs_CreatedById",
                table: "ReportJobs",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ShareLinks_Users_CreatedById",
                table: "ShareLinks",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShareLinks_Users_CreatedById",
                table: "ShareLinks");

            migrationBuilder.DropTable(
                name: "ReportJobs");

            migrationBuilder.DropIndex(
                name: "IX_ShareLinks_CreatedById",
                table: "ShareLinks");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "ShareLinks");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ShareLinks");

            migrationBuilder.DropColumn(
                name: "LastAccessedAt",
                table: "ShareLinks");

            migrationBuilder.DropColumn(
                name: "TeamId",
                table: "ShareLinks");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "ShareLinks");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "ShareLinks");
        }
    }
}
