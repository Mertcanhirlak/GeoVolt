using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSuitabilityAnalysisFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "analysis_runs",
                schema: "analysis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    study_area_district_id = table.Column<int>(type: "integer", nullable: false),
                    scoring_profile_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    algorithm_version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    grid_edge_meters = table.Column<int>(type: "integer", nullable: false),
                    metric_srid = table.Column<int>(type: "integer", nullable: false),
                    storage_srid = table.Column<int>(type: "integer", nullable: false),
                    dataset_snapshot = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    parameters = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    cell_count = table.Column<int>(type: "integer", nullable: false),
                    candidate_cell_count = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error_message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analysis_runs", x => x.id);
                    table.CheckConstraint("ck_analysis_runs_candidate_cell_count", "candidate_cell_count >= 0 AND candidate_cell_count <= cell_count");
                    table.CheckConstraint("ck_analysis_runs_cell_count", "cell_count >= 0");
                    table.CheckConstraint("ck_analysis_runs_grid_edge", "grid_edge_meters > 0");
                    table.CheckConstraint("ck_analysis_runs_metric_srid", "metric_srid > 0");
                    table.CheckConstraint("ck_analysis_runs_status", "status IN ('Pending', 'Running', 'Completed', 'Failed', 'Cancelled')");
                    table.CheckConstraint("ck_analysis_runs_storage_srid", "storage_srid > 0");
                    table.CheckConstraint("ck_analysis_runs_time_order", "completed_at_utc IS NULL OR started_at_utc IS NULL OR completed_at_utc >= started_at_utc");
                    table.ForeignKey(
                        name: "FK_analysis_runs_districts_study_area_district_id",
                        column: x => x.study_area_district_id,
                        principalSchema: "gis",
                        principalTable: "districts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_analysis_runs_scoring_profiles_scoring_profile_id",
                        column: x => x.scoring_profile_id,
                        principalSchema: "analysis",
                        principalTable: "scoring_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "suitability_cells",
                schema: "analysis",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    analysis_run_id = table.Column<int>(type: "integer", nullable: false),
                    cell_i = table.Column<int>(type: "integer", nullable: false),
                    cell_j = table.Column<int>(type: "integer", nullable: false),
                    boundary = table.Column<MultiPolygon>(type: "geometry (MultiPolygon, 4326)", nullable: false),
                    representative_point = table.Column<Point>(type: "geometry (Point, 4326)", nullable: false),
                    area_square_meters = table.Column<double>(type: "double precision", nullable: false),
                    region_id = table.Column<int>(type: "integer", nullable: true),
                    neighborhood_id = table.Column<int>(type: "integer", nullable: true),
                    evaluation_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    has_hard_exclusion = table.Column<bool>(type: "boolean", nullable: false),
                    suitability_score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    confidence_score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    nearest_transformer_meters = table.Column<double>(type: "double precision", nullable: true),
                    nearest_major_road_meters = table.Column<double>(type: "double precision", nullable: true),
                    nearest_station_meters = table.Column<double>(type: "double precision", nullable: true),
                    poi_count_300_meters = table.Column<int>(type: "integer", nullable: true),
                    poi_count_500_meters = table.Column<int>(type: "integer", nullable: true),
                    poi_count_1000_meters = table.Column<int>(type: "integer", nullable: true),
                    population_density_per_square_kilometer = table.Column<double>(type: "double precision", nullable: true),
                    slope_percent = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true),
                    estimated_cost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    metric_details = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    reason_codes = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    calculated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_suitability_cells", x => x.id);
                    table.CheckConstraint("ck_suitability_cells_area", "area_square_meters > 0");
                    table.CheckConstraint("ck_suitability_cells_boundary_valid", "NOT ST_IsEmpty(boundary) AND ST_IsValid(boundary)");
                    table.CheckConstraint("ck_suitability_cells_confidence_score", "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)");
                    table.CheckConstraint("ck_suitability_cells_distances", "(nearest_transformer_meters IS NULL OR nearest_transformer_meters >= 0) AND (nearest_major_road_meters IS NULL OR nearest_major_road_meters >= 0) AND (nearest_station_meters IS NULL OR nearest_station_meters >= 0)");
                    table.CheckConstraint("ck_suitability_cells_estimated_cost", "estimated_cost IS NULL OR estimated_cost >= 0");
                    table.CheckConstraint("ck_suitability_cells_evaluation_status", "evaluation_status IN ('OUTSIDE_STUDY_AREA', 'INSUFFICIENT_DATA', 'HARD_EXCLUSION', 'LOW_SUITABILITY', 'CANDIDATE')");
                    table.CheckConstraint("ck_suitability_cells_poi_counts", "(poi_count_300_meters IS NULL OR poi_count_300_meters >= 0) AND (poi_count_500_meters IS NULL OR poi_count_500_meters >= 0) AND (poi_count_1000_meters IS NULL OR poi_count_1000_meters >= 0)");
                    table.CheckConstraint("ck_suitability_cells_population_density", "population_density_per_square_kilometer IS NULL OR population_density_per_square_kilometer >= 0");
                    table.CheckConstraint("ck_suitability_cells_representative_point", "ST_Covers(boundary, representative_point)");
                    table.CheckConstraint("ck_suitability_cells_slope", "slope_percent IS NULL OR slope_percent >= 0");
                    table.CheckConstraint("ck_suitability_cells_suitability_score", "suitability_score IS NULL OR (suitability_score >= 0 AND suitability_score <= 100)");
                    table.ForeignKey(
                        name: "FK_suitability_cells_analysis_runs_analysis_run_id",
                        column: x => x.analysis_run_id,
                        principalSchema: "analysis",
                        principalTable: "analysis_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_suitability_cells_neighborhoods_neighborhood_id",
                        column: x => x.neighborhood_id,
                        principalSchema: "gis",
                        principalTable: "neighborhoods",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_suitability_cells_regions_region_id",
                        column: x => x.region_id,
                        principalSchema: "gis",
                        principalTable: "regions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_analysis_runs_district_created",
                schema: "analysis",
                table: "analysis_runs",
                columns: new[] { "study_area_district_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_analysis_runs_scoring_profile",
                schema: "analysis",
                table: "analysis_runs",
                column: "scoring_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_analysis_runs_status_created",
                schema: "analysis",
                table: "analysis_runs",
                columns: new[] { "status", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "gist_suitability_cells_boundary",
                schema: "analysis",
                table: "suitability_cells",
                column: "boundary")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "gist_suitability_cells_representative_point",
                schema: "analysis",
                table: "suitability_cells",
                column: "representative_point")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "ix_suitability_cells_neighborhood",
                schema: "analysis",
                table: "suitability_cells",
                column: "neighborhood_id");

            migrationBuilder.CreateIndex(
                name: "ix_suitability_cells_region",
                schema: "analysis",
                table: "suitability_cells",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "ix_suitability_cells_run_region_neighborhood",
                schema: "analysis",
                table: "suitability_cells",
                columns: new[] { "analysis_run_id", "region_id", "neighborhood_id" });

            migrationBuilder.CreateIndex(
                name: "ix_suitability_cells_run_status_score",
                schema: "analysis",
                table: "suitability_cells",
                columns: new[] { "analysis_run_id", "evaluation_status", "suitability_score" });

            migrationBuilder.CreateIndex(
                name: "uq_suitability_cells_run_grid",
                schema: "analysis",
                table: "suitability_cells",
                columns: new[] { "analysis_run_id", "cell_i", "cell_j" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "suitability_cells",
                schema: "analysis");

            migrationBuilder.DropTable(
                name: "analysis_runs",
                schema: "analysis");
        }
    }
}
