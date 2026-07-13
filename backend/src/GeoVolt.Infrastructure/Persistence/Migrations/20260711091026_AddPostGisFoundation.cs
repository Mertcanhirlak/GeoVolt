using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GeoVolt.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPostGisFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SCHEMA IF NOT EXISTS staging;");

            migrationBuilder.EnsureSchema(
                name: "analysis");

            migrationBuilder.EnsureSchema(
                name: "gis");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "candidate_points",
                schema: "analysis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    EstimatedAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Region = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Neighborhood = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CostScore = table.Column<int>(type: "integer", nullable: true),
                    DemandScore = table.Column<int>(type: "integer", nullable: true),
                    GeneralScore = table.Column<int>(type: "integer", nullable: true),
                    EnergyScore = table.Column<int>(type: "integer", nullable: true),
                    AccessScore = table.Column<int>(type: "integer", nullable: true),
                    CompetitionPenalty = table.Column<int>(type: "integer", nullable: true),
                    Location = table.Column<Point>(type: "geometry (Point, 4326)", nullable: true),
                    RegionId = table.Column<int>(type: "integer", nullable: true),
                    NeighborhoodId = table.Column<int>(type: "integer", nullable: true),
                    NearestTransformerMeters = table.Column<double>(type: "double precision", nullable: true),
                    NearestMajorRoadMeters = table.Column<double>(type: "double precision", nullable: true),
                    NearestStationMeters = table.Column<double>(type: "double precision", nullable: true),
                    PoiCount300Meters = table.Column<int>(type: "integer", nullable: true),
                    PoiCount500Meters = table.Column<int>(type: "integer", nullable: true),
                    PoiCount1000Meters = table.Column<int>(type: "integer", nullable: true),
                    Population = table.Column<int>(type: "integer", nullable: true),
                    SuitabilityDegree = table.Column<double>(type: "double precision", nullable: true),
                    SuitabilityPercent = table.Column<double>(type: "double precision", nullable: true),
                    AlgorithmVersion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CalculatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SystemType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PlaceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_candidate_points", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dataset_imports",
                schema: "gis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DatasetName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    SourceFile = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SourceDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FeatureCount = table.Column<int>(type: "integer", nullable: false),
                    SourceSrid = table.Column<int>(type: "integer", nullable: true),
                    TargetSrid = table.Column<int>(type: "integer", nullable: false),
                    ImportedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dataset_imports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "districts",
                schema: "gis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    population = table.Column<int>(type: "integer", nullable: true),
                    boundary = table.Column<Geometry>(type: "geometry (MultiPolygon, 4326)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_districts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "pois",
                schema: "gis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Category = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    SubCategory = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Website = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Location = table.Column<Point>(type: "geometry (Point, 4326)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pois", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "power_transformers",
                schema: "gis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    TransformerType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Location = table.Column<Point>(type: "geometry (Point, 4326)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_power_transformers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "roads",
                schema: "gis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    RoadType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Speed = table.Column<double>(type: "double precision", nullable: true),
                    AverageSpeed = table.Column<double>(type: "double precision", nullable: true),
                    Geometry = table.Column<Geometry>(type: "geometry (MultiLineString, 4326)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roads", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "scoring_profiles",
                schema: "analysis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DemandWeight = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    EnergyWeight = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    AccessWeight = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    CompetitionWeight = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scoring_profiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "regions",
                schema: "gis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source_id = table.Column<int>(type: "integer", nullable: false),
                    district_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    boundary = table.Column<Geometry>(type: "geometry (MultiPolygon, 4326)", nullable: false),
                    population = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_regions", x => x.id);
                    table.ForeignKey(
                        name: "FK_regions_districts_district_id",
                        column: x => x.district_id,
                        principalSchema: "gis",
                        principalTable: "districts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "neighborhoods",
                schema: "gis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    region_id = table.Column<int>(type: "integer", nullable: false),
                    boundary = table.Column<Geometry>(type: "geometry (MultiPolygon, 4326)", nullable: false),
                    population = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_neighborhoods", x => x.id);
                    table.ForeignKey(
                        name: "FK_neighborhoods_regions_region_id",
                        column: x => x.region_id,
                        principalSchema: "gis",
                        principalTable: "regions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "charging_stations",
                schema: "gis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source_station_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    operator_name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    brand_name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    region_id = table.Column<int>(type: "integer", nullable: false),
                    neighborhood_id = table.Column<int>(type: "integer", nullable: false),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    location = table.Column<Point>(type: "geometry (Point, 4326)", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_green_station = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_charging_stations", x => x.id);
                    table.ForeignKey(
                        name: "FK_charging_stations_neighborhoods_neighborhood_id",
                        column: x => x.neighborhood_id,
                        principalSchema: "gis",
                        principalTable: "neighborhoods",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_charging_stations_regions_region_id",
                        column: x => x.region_id,
                        principalSchema: "gis",
                        principalTable: "regions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "charging_connectors",
                schema: "gis",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    charging_station_id = table.Column<int>(type: "integer", nullable: false),
                    source_socket_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    socket_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    connector_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    power_kw = table.Column<double>(type: "double precision", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_charging_connectors", x => x.id);
                    table.ForeignKey(
                        name: "FK_charging_connectors_charging_stations_charging_station_id",
                        column: x => x.charging_station_id,
                        principalSchema: "gis",
                        principalTable: "charging_stations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_AlgorithmVersion",
                schema: "analysis",
                table: "candidate_points",
                column: "AlgorithmVersion");

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_Location",
                schema: "analysis",
                table: "candidate_points",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_RegionId_NeighborhoodId",
                schema: "analysis",
                table: "candidate_points",
                columns: new[] { "RegionId", "NeighborhoodId" });

            migrationBuilder.CreateIndex(
                name: "IX_candidate_points_Status_GeneralScore",
                schema: "analysis",
                table: "candidate_points",
                columns: new[] { "Status", "GeneralScore" });

            migrationBuilder.CreateIndex(
                name: "IX_charging_connectors_charging_station_id_source_socket_number",
                schema: "gis",
                table: "charging_connectors",
                columns: new[] { "charging_station_id", "source_socket_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_charging_stations_location",
                schema: "gis",
                table: "charging_stations",
                column: "location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_charging_stations_neighborhood_id",
                schema: "gis",
                table: "charging_stations",
                column: "neighborhood_id");

            migrationBuilder.CreateIndex(
                name: "IX_charging_stations_operator_name",
                schema: "gis",
                table: "charging_stations",
                column: "operator_name");

            migrationBuilder.CreateIndex(
                name: "IX_charging_stations_region_id",
                schema: "gis",
                table: "charging_stations",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_charging_stations_source_station_number",
                schema: "gis",
                table: "charging_stations",
                column: "source_station_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dataset_imports_DatasetName_ImportedAtUtc",
                schema: "gis",
                table: "dataset_imports",
                columns: new[] { "DatasetName", "ImportedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_dataset_imports_Sha256",
                schema: "gis",
                table: "dataset_imports",
                column: "Sha256",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_districts_boundary",
                schema: "gis",
                table: "districts",
                column: "boundary")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_districts_name",
                schema: "gis",
                table: "districts",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_districts_source_id",
                schema: "gis",
                table: "districts",
                column: "source_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_neighborhoods_boundary",
                schema: "gis",
                table: "neighborhoods",
                column: "boundary")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_neighborhoods_name",
                schema: "gis",
                table: "neighborhoods",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_neighborhoods_region_id",
                schema: "gis",
                table: "neighborhoods",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_neighborhoods_source_id",
                schema: "gis",
                table: "neighborhoods",
                column: "source_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pois_Category_SubCategory",
                schema: "gis",
                table: "pois",
                columns: new[] { "Category", "SubCategory" });

            migrationBuilder.CreateIndex(
                name: "IX_pois_Location",
                schema: "gis",
                table: "pois",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_pois_SourceId",
                schema: "gis",
                table: "pois",
                column: "SourceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_power_transformers_Location",
                schema: "gis",
                table: "power_transformers",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_power_transformers_SourceId",
                schema: "gis",
                table: "power_transformers",
                column: "SourceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_power_transformers_TransformerType",
                schema: "gis",
                table: "power_transformers",
                column: "TransformerType");

            migrationBuilder.CreateIndex(
                name: "IX_regions_boundary",
                schema: "gis",
                table: "regions",
                column: "boundary")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_regions_district_id",
                schema: "gis",
                table: "regions",
                column: "district_id");

            migrationBuilder.CreateIndex(
                name: "IX_regions_name",
                schema: "gis",
                table: "regions",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_regions_source_id",
                schema: "gis",
                table: "regions",
                column: "source_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_roads_Geometry",
                schema: "gis",
                table: "roads",
                column: "Geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_roads_RoadType",
                schema: "gis",
                table: "roads",
                column: "RoadType");

            migrationBuilder.CreateIndex(
                name: "IX_roads_SourceId",
                schema: "gis",
                table: "roads",
                column: "SourceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scoring_profiles_IsActive",
                schema: "analysis",
                table: "scoring_profiles",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_scoring_profiles_Name_Version",
                schema: "analysis",
                table: "scoring_profiles",
                columns: new[] { "Name", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "candidate_points",
                schema: "analysis");

            migrationBuilder.DropTable(
                name: "charging_connectors",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "dataset_imports",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "pois",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "power_transformers",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "roads",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "scoring_profiles",
                schema: "analysis");

            migrationBuilder.DropTable(
                name: "charging_stations",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "neighborhoods",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "regions",
                schema: "gis");

            migrationBuilder.DropTable(
                name: "districts",
                schema: "gis");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.Sql("DROP SCHEMA IF EXISTS staging;");
        }
    }
}
