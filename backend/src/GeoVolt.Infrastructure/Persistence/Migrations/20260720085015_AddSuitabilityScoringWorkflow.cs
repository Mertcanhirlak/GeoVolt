using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSuitabilityScoringWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs");

            migrationBuilder.DropColumn(
                name: "AccessWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "CompetitionWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "DemandWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "EnergyWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.AddColumn<decimal>(
                name: "TransformerWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.25m);

            migrationBuilder.AddColumn<decimal>(
                name: "MajorRoadWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.20m);

            migrationBuilder.AddColumn<decimal>(
                name: "PoiWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.20m);

            migrationBuilder.AddColumn<decimal>(
                name: "PopulationWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.15m);

            migrationBuilder.AddColumn<decimal>(
                name: "StationGapWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.10m);

            migrationBuilder.AddColumn<decimal>(
                name: "SlopeWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.10m);

            migrationBuilder.AddColumn<decimal>(
                name: "RecommendationPercentile",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.90m);

            migrationBuilder.AddCheckConstraint(
                name: "ck_scoring_profiles_recommendation_percentile",
                schema: "analysis",
                table: "scoring_profiles",
                sql: "\"RecommendationPercentile\" > 0 AND \"RecommendationPercentile\" < 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_scoring_profiles_weights",
                schema: "analysis",
                table: "scoring_profiles",
                sql: "\"TransformerWeight\" >= 0 AND \"MajorRoadWeight\" >= 0 AND \"PoiWeight\" >= 0 AND \"PopulationWeight\" >= 0 AND \"StationGapWeight\" >= 0 AND \"SlopeWeight\" >= 0 AND ABS((\"TransformerWeight\" + \"MajorRoadWeight\" + \"PoiWeight\" + \"PopulationWeight\" + \"StationGapWeight\" + \"SlopeWeight\") - 1.0) < 0.0001");

            migrationBuilder.AddCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs",
                sql: "status IN ('Pending', 'Running', 'GridReady', 'MetricsReady', 'Scored', 'Completed', 'Failed', 'Cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_scoring_profiles_recommendation_percentile",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropCheckConstraint(
                name: "ck_scoring_profiles_weights",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs");

            migrationBuilder.DropColumn(
                name: "MajorRoadWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "PoiWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "PopulationWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "TransformerWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "StationGapWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "SlopeWeight",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.DropColumn(
                name: "RecommendationPercentile",
                schema: "analysis",
                table: "scoring_profiles");

            migrationBuilder.AddColumn<decimal>(
                name: "AccessWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.30m);

            migrationBuilder.AddColumn<decimal>(
                name: "CompetitionWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.10m);

            migrationBuilder.AddColumn<decimal>(
                name: "DemandWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.35m);

            migrationBuilder.AddColumn<decimal>(
                name: "EnergyWeight",
                schema: "analysis",
                table: "scoring_profiles",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.25m);

            migrationBuilder.AddCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs",
                sql: "status IN ('Pending', 'Running', 'GridReady', 'MetricsReady', 'Completed', 'Failed', 'Cancelled')");
        }
    }
}
