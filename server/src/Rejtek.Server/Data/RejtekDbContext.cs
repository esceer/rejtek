using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Rejtek.Server.Data;

public sealed class RejtekDbContext(DbContextOptions<RejtekDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<AccessToken> AccessTokens => Set<AccessToken>();

    public DbSet<PairingToken> PairingTokens => Set<PairingToken>();

    public DbSet<VaultItem> VaultItems => Set<VaultItem>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // SQLite has no native DateTimeOffset; store UTC ticks so values stay sortable and comparable.
        configurationBuilder.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToBinaryConverter>();
        configurationBuilder.Properties<AccessTokenKind>().HaveConversion<string>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.HasIndex(u => u.Username).IsUnique();
            user.ComplexProperty(u => u.WrappedVaultKey);
        });

        modelBuilder.Entity<AccessToken>(token =>
        {
            token.HasIndex(t => t.TokenHash).IsUnique();
            token.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PairingToken>(token =>
        {
            token.HasIndex(t => t.TokenHash).IsUnique();
            token.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VaultItem>(item =>
        {
            item.HasKey(i => new { i.UserId, i.Id });
            item.Property(i => i.Version).IsConcurrencyToken();
            item.HasOne<User>().WithMany().HasForeignKey(i => i.UserId).OnDelete(DeleteBehavior.Cascade);
            item.ComplexProperty(i => i.Data);
        });
    }
}
