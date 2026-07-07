using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompaniesAndAdminUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "company_id",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    tax_number = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    contact_email = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_companies", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_company_id",
                table: "users",
                column: "company_id");

            migrationBuilder.AddForeignKey(
                name: "FK_users_companies_company_id",
                table: "users",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_users_companies_company_id",
                table: "users");

            migrationBuilder.DropTable(
                name: "companies");

            migrationBuilder.DropIndex(
                name: "IX_users_company_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "users");
        }
    }
}
