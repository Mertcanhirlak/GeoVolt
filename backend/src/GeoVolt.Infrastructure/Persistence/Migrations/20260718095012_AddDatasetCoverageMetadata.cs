using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDatasetCoverageMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dataset_coverages",
                schema: "gis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dataset_import_id = table.Column<int>(type: "integer", nullable: false),
                    coverage_geometry = table.Column<MultiPolygon>(type: "geometry (MultiPolygon, 4326)", nullable: true),
                    coverage_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    completeness_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    quality_score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    is_authoritative = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dataset_coverages", x => x.id);
                    table.CheckConstraint("ck_dataset_coverages_completeness_status", "completeness_status IN ('Unknown', 'Partial', 'Complete')");
                    table.CheckConstraint("ck_dataset_coverages_coverage_status", "coverage_status IN ('Unknown', 'Declared', 'Verified')");
                    table.CheckConstraint("ck_dataset_coverages_geometry_required", "coverage_status = 'Unknown' OR coverage_geometry IS NOT NULL");
                    table.CheckConstraint("ck_dataset_coverages_quality_score", "quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)");
                    table.ForeignKey(
                        name: "FK_dataset_coverages_dataset_imports_dataset_import_id",
                        column: x => x.dataset_import_id,
                        principalSchema: "gis",
                        principalTable: "dataset_imports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_dataset_coverages_coverage_geometry",
                schema: "gis",
                table: "dataset_coverages",
                column: "coverage_geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_coverages_coverage_status_completeness_status",
                schema: "gis",
                table: "dataset_coverages",
                columns: new[] { "coverage_status", "completeness_status" });

            migrationBuilder.CreateIndex(
                name: "IX_dataset_coverages_dataset_import_id",
                schema: "gis",
                table: "dataset_coverages",
                column: "dataset_import_id",
                unique: true);

            migrationBuilder.Sql(
                """
                INSERT INTO gis.dataset_coverages (
                    dataset_import_id,
                    coverage_status,
                    completeness_status,
                    is_authoritative,
                    notes,
                    created_at_utc,
                    updated_at_utc)
                SELECT
                    dataset_import."Id",
                    'Unknown',
                    'Unknown',
                    FALSE,
                    'Backfilled from an existing promoted dataset import; coverage has not been verified.',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM gis.dataset_imports dataset_import
                WHERE dataset_import."Status" = 'Promoted'
                ON CONFLICT (dataset_import_id) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dataset_coverages",
                schema: "gis");
        }
    }
}
