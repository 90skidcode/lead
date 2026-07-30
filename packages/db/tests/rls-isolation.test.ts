import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

describe('RLS Isolation Tests', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should prevent tenant A from reading tenant B data via RLS', async () => {
    const client = await pool.connect();

    try {
      // Create two tenants
      const tenant1Result = await client.query(
        `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
        ['Tenant A', 'tenant-a']
      );
      const tenant1Id = tenant1Result.rows[0].id;

      const tenant2Result = await client.query(
        `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
        ['Tenant B', 'tenant-b']
      );
      const tenant2Id = tenant2Result.rows[0].id;

      // Create a team in tenant A
      const team1Result = await client.query(
        `INSERT INTO teams (tenant_id, name) VALUES ($1, $2) RETURNING id`,
        [tenant1Id, 'Team A']
      );
      const team1Id = team1Result.rows[0].id;

      // Create a team in tenant B
      const team2Result = await client.query(
        `INSERT INTO teams (tenant_id, name) VALUES ($1, $2) RETURNING id`,
        [tenant2Id, 'Team B']
      );

      // Now set the tenant context to tenant A and try to read
      await client.query(`SET app.current_tenant_id = $1::uuid`, [tenant1Id]);
      const teamsAsA = await client.query(`SELECT * FROM teams`);

      // Should only see team1 (Team A)
      expect(teamsAsA.rows).toHaveLength(1);
      expect(teamsAsA.rows[0].id).toBe(team1Id);

      // Switch context to tenant B
      await client.query(`SET app.current_tenant_id = $1::uuid`, [tenant2Id]);
      const teamsAsB = await client.query(`SELECT * FROM teams`);

      // Should not see team1, should see Team B
      expect(teamsAsB.rows).toHaveLength(1);
      expect(teamsAsB.rows[0].name).toBe('Team B');
    } finally {
      client.release();
    }
  });

  it('should prevent write operations across tenant boundaries', async () => {
    const client = await pool.connect();

    try {
      // Create two tenants
      const tenant1Result = await client.query(
        `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
        ['Tenant Write A', 'tenant-write-a']
      );
      const tenant1Id = tenant1Result.rows[0].id;

      const tenant2Result = await client.query(
        `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
        ['Tenant Write B', 'tenant-write-b']
      );
      const tenant2Id = tenant2Result.rows[0].id;

      // Set context to tenant 1
      await client.query(`SET app.current_tenant_id = $1::uuid`, [tenant1Id]);

      // Try to insert into tenant 2 (should fail due to RLS)
      try {
        await client.query(
          `INSERT INTO teams (tenant_id, name) VALUES ($1, $2)`,
          [tenant2Id, 'Malicious Team']
        );
        // If we get here, RLS is not working
        throw new Error('RLS should have prevented cross-tenant write');
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('RLS')) {
          throw error;
        }
        // Expected: permission denied
        expect(error).toBeDefined();
      }
    } finally {
      client.release();
    }
  });
});
