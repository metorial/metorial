import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  searchDashboards: vi.fn()
}));

vi.mock('../lib/client', () => ({
  LookerClient: vi.fn(() => clientMocks)
}));

import { searchDashboards } from './search-dashboards';

let invocation = (input: Record<string, unknown>) =>
  searchDashboards.handleInvocation({
    auth: { token: 'test-token' },
    config: { instanceUrl: 'https://example.looker.com' },
    input
  } as never);

describe('search_dashboards creator filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by creator user ID and returns creator metadata', async () => {
    clientMocks.searchDashboards.mockResolvedValueOnce([
      {
        id: 'dashboard-42',
        title: 'Quarterly Revenue',
        user_id: 'user-7',
        user_name: 'Iris Analyst'
      }
    ]);

    let result = await invocation({ creatorUserId: 'user-7' });

    expect(clientMocks.searchDashboards).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-7' })
    );
    expect(result.output.dashboards).toEqual([
      expect.objectContaining({
        dashboardId: 'dashboard-42',
        creatorUserId: 'user-7',
        creatorUserName: 'Iris Analyst'
      })
    ]);
  });
});
