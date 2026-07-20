using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddManualPinCostingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "costing");

            migrationBuilder.CreateTable(
                name: "cost_model_settings",
                schema: "costing",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    route_multiplier = table.Column<decimal>(type: "numeric(6,3)", precision: 6, scale: 3, nullable: false),
                    rounding_step = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cost_model_settings", x => x.id);
                    table.CheckConstraint("ck_cost_model_settings_currency_code", "char_length(currency_code) = 3");
                    table.CheckConstraint("ck_cost_model_settings_rounding_step", "rounding_step > 0");
                    table.CheckConstraint("ck_cost_model_settings_route_multiplier", "route_multiplier > 0");
                    table.CheckConstraint("ck_cost_model_settings_single_row", "id = 1");
                });

            migrationBuilder.CreateTable(
                name: "cost_profiles",
                schema: "costing",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    system_type = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    power_kw = table.Column<int>(type: "integer", nullable: false),
                    equipment_cost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    fixed_electrical_infrastructure_cost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    cable_unit_cost_per_meter = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    fixed_site_cost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    trench_restoration_unit_cost_per_meter = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    risk_rate = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cost_profiles", x => x.id);
                    table.CheckConstraint("ck_cost_profiles_cable_cost", "cable_unit_cost_per_meter >= 0");
                    table.CheckConstraint("ck_cost_profiles_equipment_cost", "equipment_cost >= 0");
                    table.CheckConstraint("ck_cost_profiles_fixed_electrical_cost", "fixed_electrical_infrastructure_cost >= 0");
                    table.CheckConstraint("ck_cost_profiles_fixed_site_cost", "fixed_site_cost >= 0");
                    table.CheckConstraint("ck_cost_profiles_power_kw", "power_kw > 0");
                    table.CheckConstraint("ck_cost_profiles_risk_rate", "risk_rate >= 0 AND risk_rate <= 1");
                    table.CheckConstraint("ck_cost_profiles_system_type", "system_type IN ('AC', 'DC')");
                    table.CheckConstraint("ck_cost_profiles_trench_cost", "trench_restoration_unit_cost_per_meter >= 0");
                });

            migrationBuilder.CreateTable(
                name: "slope_cost_bands",
                schema: "costing",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    min_slope_percent = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    max_slope_percent = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true),
                    extra_rate = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_slope_cost_bands", x => x.id);
                    table.CheckConstraint("ck_slope_cost_bands_extra_rate", "extra_rate >= 0 AND extra_rate <= 1");
                    table.CheckConstraint("ck_slope_cost_bands_maximum", "max_slope_percent IS NULL OR max_slope_percent > min_slope_percent");
                    table.CheckConstraint("ck_slope_cost_bands_minimum", "min_slope_percent >= 0");
                });

            migrationBuilder.CreateTable(
                name: "venue_cost_multipliers",
                schema: "costing",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    venue_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    multiplier = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_venue_cost_multipliers", x => x.id);
                    table.CheckConstraint("ck_venue_cost_multipliers_multiplier", "multiplier > 0");
                    table.CheckConstraint("ck_venue_cost_multipliers_name", "length(trim(venue_type)) > 0");
                });

            migrationBuilder.InsertData(
                schema: "costing",
                table: "cost_model_settings",
                columns: new[] { "id", "currency_code", "rounding_step", "route_multiplier", "updated_at", "version" },
                values: new object[] { 1, "TRY", 1000.00m, 1.150m, new DateTime(2026, 7, 17, 0, 0, 0, 0, DateTimeKind.Utc), "2026.1" });

            migrationBuilder.InsertData(
                schema: "costing",
                table: "cost_profiles",
                columns: new[] { "id", "cable_unit_cost_per_meter", "equipment_cost", "fixed_electrical_infrastructure_cost", "fixed_site_cost", "power_kw", "risk_rate", "system_type", "trench_restoration_unit_cost_per_meter" },
                values: new object[,]
                {
                    { 1, 761.00m, 44300.00m, 50000.00m, 25000.00m, 22, 0.1000m, "AC", 1500.00m },
                    { 2, 3181.00m, 700000.00m, 200000.00m, 40000.00m, 60, 0.1500m, "DC", 1700.00m },
                    { 3, 5353.00m, 1200000.00m, 350000.00m, 50000.00m, 120, 0.1500m, "DC", 1700.00m }
                });

            migrationBuilder.InsertData(
                schema: "costing",
                table: "slope_cost_bands",
                columns: new[] { "id", "extra_rate", "max_slope_percent", "min_slope_percent" },
                values: new object[,]
                {
                    { 1, 0.0000m, 3.00m, 0.00m },
                    { 2, 0.0500m, 6.00m, 3.00m },
                    { 3, 0.1200m, 10.00m, 6.00m },
                    { 4, 0.2500m, 15.00m, 10.00m },
                    { 5, 0.4000m, null, 15.00m }
                });

            migrationBuilder.InsertData(
                schema: "costing",
                table: "venue_cost_multipliers",
                columns: new[] { "id", "multiplier", "venue_type" },
                values: new object[,]
                {
                    { 1, 1.0000m, "Workplace" },
                    { 2, 1.0800m, "Mall" },
                    { 3, 1.1500m, "Highway" }
                });

            migrationBuilder.CreateIndex(
                name: "uq_cost_profiles_system_type_power_kw",
                schema: "costing",
                table: "cost_profiles",
                columns: new[] { "system_type", "power_kw" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_slope_cost_bands_minimum",
                schema: "costing",
                table: "slope_cost_bands",
                column: "min_slope_percent",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_venue_cost_multipliers_venue_type",
                schema: "costing",
                table: "venue_cost_multipliers",
                column: "venue_type",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cost_model_settings",
                schema: "costing");

            migrationBuilder.DropTable(
                name: "cost_profiles",
                schema: "costing");

            migrationBuilder.DropTable(
                name: "slope_cost_bands",
                schema: "costing");

            migrationBuilder.DropTable(
                name: "venue_cost_multipliers",
                schema: "costing");
        }
    }
}
