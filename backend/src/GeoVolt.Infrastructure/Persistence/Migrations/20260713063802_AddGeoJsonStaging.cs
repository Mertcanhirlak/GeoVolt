using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGeoJsonStaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "staging");

            migrationBuilder.CreateTable(
                name: "geojson_features",
                schema: "staging",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DatasetImportId = table.Column<int>(type: "integer", nullable: false),
                    FeatureIndex = table.Column<int>(type: "integer", nullable: false),
                    SourceFeatureId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    GeometryType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PropertiesJson = table.Column<string>(type: "jsonb", nullable: false),
                    GeometryJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_geojson_features", x => x.Id);
                    table.ForeignKey(
                        name: "FK_geojson_features_dataset_imports_DatasetImportId",
                        column: x => x.DatasetImportId,
                        principalSchema: "gis",
                        principalTable: "dataset_imports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_geojson_features_DatasetImportId_FeatureIndex",
                schema: "staging",
                table: "geojson_features",
                columns: new[] { "DatasetImportId", "FeatureIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_geojson_features_DatasetImportId_SourceFeatureId",
                schema: "staging",
                table: "geojson_features",
                columns: new[] { "DatasetImportId", "SourceFeatureId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "geojson_features",
                schema: "staging");
        }
    }
}
