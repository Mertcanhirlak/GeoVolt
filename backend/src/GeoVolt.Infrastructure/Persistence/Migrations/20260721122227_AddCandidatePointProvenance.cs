using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidatePointProvenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "created_at_utc",
                schema: "analysis",
                table: "candidate_points",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<int>(
                name: "created_by_user_id",
                schema: "analysis",
                table: "candidate_points",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "source_analysis_run_id",
                schema: "analysis",
                table: "candidate_points",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "source_suitability_cell_id",
                schema: "analysis",
                table: "candidate_points",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source_type",
                schema: "analysis",
                table: "candidate_points",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "ADMIN_MANUAL");

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_created_by_user_id",
                schema: "analysis",
                table: "candidate_points",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_source_analysis_run_id",
                schema: "analysis",
                table: "candidate_points",
                column: "source_analysis_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_source_suitability_cell_id",
                schema: "analysis",
                table: "candidate_points",
                column: "source_suitability_cell_id",
                unique: true,
                filter: "source_suitability_cell_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_source_type_created_at_utc",
                schema: "analysis",
                table: "candidate_points",
                columns: new[] { "source_type", "created_at_utc" });

            migrationBuilder.AddForeignKey(
                name: "FK_candidate_points_analysis_runs_source_analysis_run_id",
                schema: "analysis",
                table: "candidate_points",
                column: "source_analysis_run_id",
                principalSchema: "analysis",
                principalTable: "analysis_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_candidate_points_suitability_cells_source_suitability_cell_~",
                schema: "analysis",
                table: "candidate_points",
                column: "source_suitability_cell_id",
                principalSchema: "analysis",
                principalTable: "suitability_cells",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_candidate_points_users_created_by_user_id",
                schema: "analysis",
                table: "candidate_points",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_candidate_points_analysis_runs_source_analysis_run_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropForeignKey(
                name: "FK_candidate_points_suitability_cells_source_suitability_cell_~",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropForeignKey(
                name: "FK_candidate_points_users_created_by_user_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropIndex(
                name: "IX_candidate_points_created_by_user_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropIndex(
                name: "IX_candidate_points_source_analysis_run_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropIndex(
                name: "IX_candidate_points_source_suitability_cell_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropIndex(
                name: "IX_candidate_points_source_type_created_at_utc",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropColumn(
                name: "created_at_utc",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropColumn(
                name: "source_analysis_run_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropColumn(
                name: "source_suitability_cell_id",
                schema: "analysis",
                table: "candidate_points");

            migrationBuilder.DropColumn(
                name: "source_type",
                schema: "analysis",
                table: "candidate_points");
        }
    }
}
