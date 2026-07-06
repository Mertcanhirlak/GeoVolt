using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.ToTable("companies");

        builder.HasKey(company => company.Id);

        builder.Property(company => company.Id)
            .HasColumnName("id");

        builder.Property(company => company.Name)
            .HasColumnName("name")
            .HasMaxLength(160)
            .IsRequired();

        builder.Property(company => company.TaxNumber)
            .HasColumnName("tax_number")
            .HasMaxLength(40);

        builder.Property(company => company.ContactEmail)
            .HasColumnName("contact_email")
            .HasMaxLength(180);

        builder.Property(company => company.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(company => company.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");
    }
}
