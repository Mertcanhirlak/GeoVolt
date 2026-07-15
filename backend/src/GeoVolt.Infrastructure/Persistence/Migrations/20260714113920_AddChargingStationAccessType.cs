using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChargingStationAccessType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "access_type",
                schema: "gis",
                table: "charging_stations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_charging_stations_access_type",
                schema: "gis",
                table: "charging_stations",
                column: "access_type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_charging_stations_access_type",
                schema: "gis",
                table: "charging_stations");

            migrationBuilder.DropColumn(
                name: "access_type",
                schema: "gis",
                table: "charging_stations");
        }
    }
}
