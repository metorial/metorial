import { describe, expect, it, vi } from 'vitest';
import { createMotherDuckClient, motherDuckPostgresHost } from './client';

describe('MotherDuck native SQL client', () => {
  it('maps each supported region to the documented TLS hostname', () => {
    expect(motherDuckPostgresHost('eu-central-1')).toBe('pg.eu-central-1-aws.motherduck.com');
  });

  it('uses MD_USER_INFO for profile validation', async () => {
    let executor = vi.fn(async (_database: string, _sql: string) => ({
      rows: [
        {
          user_id: 'user-1',
          username: 'ada@example.com',
          org_id: 'org-1',
          org_name: 'Analytics',
          region: 'eu-central-1'
        }
      ],
      fields: [],
      rowCount: 1
    }));
    let profile = await createMotherDuckClient('token', 'eu-central-1', executor).getProfile();

    expect(executor).toHaveBeenCalledWith('md:', 'SELECT * FROM MD_USER_INFO()', []);
    expect(profile).toEqual({ id: 'user-1', name: 'ada@example.com (Analytics)' });
  });
});
