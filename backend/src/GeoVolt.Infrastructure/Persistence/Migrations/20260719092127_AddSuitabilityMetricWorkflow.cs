using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSuitabilityMetricWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs");

            migrationBuilder.AddCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs",
                sql: "status IN ('Pending', 'Running', 'GridReady', 'MetricsReady', 'Completed', 'Failed', 'Cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs");

            migrationBuilder.AddCheckConstraint(
                name: "ck_analysis_runs_status",
                schema: "analysis",
                table: "analysis_runs",
                sql: "status IN ('Pending', 'Running', 'GridReady', 'Completed', 'Failed', 'Cancelled')");
        }
    }
}
