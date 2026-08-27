import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  getAuditLogEntries: vi.fn(),
  getFeatureFlag: vi.fn(),
  inviteMembers: vi.fn(),
  listExperiments: vi.fn(),
  listMetrics: vi.fn(),
  searchContexts: vi.fn()
}));

vi.mock('./lib/client', () => ({
  LaunchDarklyClient: class {
    getAuditLogEntries(...args: unknown[]) {
      return clientMocks.getAuditLogEntries(...args);
    }

    getFeatureFlag(...args: unknown[]) {
      return clientMocks.getFeatureFlag(...args);
    }

    inviteMembers(...args: unknown[]) {
      return clientMocks.inviteMembers(...args);
    }

    listExperiments(...args: unknown[]) {
      return clientMocks.listExperiments(...args);
    }

    listMetrics(...args: unknown[]) {
      return clientMocks.listMetrics(...args);
    }

    searchContexts(...args: unknown[]) {
      return clientMocks.searchContexts(...args);
    }
  }
}));

import { getFeatureFlag } from './tools/get-feature-flag';
import { inviteMembers } from './tools/invite-members';
import { listExperiments } from './tools/list-experiments';
import { listMetrics } from './tools/list-metrics';
import { manageEnvironment } from './tools/manage-environment';
import { manageProject } from './tools/manage-project';
import { manageSegment } from './tools/manage-segment';
import { searchContexts } from './tools/search-contexts';
import { flagChangeTrigger } from './triggers/flag-change';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'api-token', baseUrl: 'https://app.launchdarkly.com/api/v2' },
    config: { projectKey: 'configured-project', environmentKey: 'configured-environment' }
  }) as any;

beforeEach(() => {
  for (let mock of Object.values(clientMocks)) mock.mockReset();
});

describe('LaunchDarkly tool response contracts', () => {
  it('marks consolidated tools with delete actions as destructive', () => {
    expect([manageProject, manageEnvironment, manageSegment].map(tool => tool.tags)).toEqual([
      expect.objectContaining({ destructive: true }),
      expect.objectContaining({ destructive: true }),
      expect.objectContaining({ destructive: true })
    ]);
  });

  it('returns both legacy user targets and non-user context targets for a flag', async () => {
    clientMocks.getFeatureFlag.mockResolvedValueOnce({
      key: 'checkout',
      name: 'Checkout',
      kind: 'boolean',
      creationDate: 1,
      variations: [],
      environments: {
        production: {
          on: true,
          targets: [{ values: ['user-1'], variation: 0 }],
          contextTargets: [{ contextKind: 'organization', values: ['org-1'], variation: 1 }]
        }
      }
    });

    let result = await getFeatureFlag.handleInvocation(
      createCtx({
        projectKey: 'storefront',
        environmentKey: 'production',
        flagKey: 'checkout'
      })
    );

    expect(result.output.targets).toEqual([
      { contextKind: 'user', values: ['user-1'], variationIndex: 0 },
      { contextKind: 'organization', values: ['org-1'], variationIndex: 1 }
    ]);
  });

  it('maps archived metrics without reporting them as active and forwards list controls', async () => {
    clientMocks.listMetrics.mockResolvedValueOnce({
      items: [
        {
          key: 'conversion',
          name: 'Conversion',
          kind: 'custom',
          archived: true,
          isNumeric: false,
          _creationDate: 1
        }
      ],
      totalCount: 1
    });

    let result = await listMetrics.handleInvocation(
      createCtx({
        projectKey: 'storefront',
        limit: 10,
        offset: 20,
        filter: 'query equals "conversion"',
        sort: '-createdAt'
      })
    );

    expect(clientMocks.listMetrics).toHaveBeenCalledWith('storefront', {
      limit: 10,
      offset: 20,
      filter: 'query equals "conversion"',
      sort: '-createdAt'
    });
    expect(result.output.metrics[0]).toMatchObject({ archived: true, isActive: false });
  });

  it('uses the documented snake-case experiment total', async () => {
    clientMocks.listExperiments.mockResolvedValueOnce({ items: [], total_count: 42 });

    let result = await listExperiments.handleInvocation(
      createCtx({ projectKey: 'storefront', environmentKey: 'production' })
    );

    expect(result.output.totalCount).toBe(42);
  });

  it('preserves multi-context instance identity and context kinds', async () => {
    clientMocks.searchContexts.mockResolvedValueOnce({
      items: [
        {
          id: 'organization:org-1:user:user-1',
          context: {
            kind: 'multi',
            organization: { key: 'org-1', name: 'Acme' },
            user: { key: 'user-1', name: 'Ada' }
          }
        }
      ]
    });

    let result = await searchContexts.handleInvocation(
      createCtx({ projectKey: 'storefront', environmentKey: 'production' })
    );

    expect(result.output.contexts[0]).toMatchObject({
      contextKind: 'multi',
      contextInstanceId: 'organization:org-1:user:user-1',
      contextKinds: ['organization', 'user']
    });
    expect(result.output.contexts[0].contextKey).toBeUndefined();
  });

  it('rejects invitations that provide neither a base role nor custom roles', async () => {
    await expect(
      inviteMembers.handleInvocation(createCtx({ members: [{ email: 'new@example.com' }] }))
    ).rejects.toBeDefined();
    expect(clientMocks.inviteMembers).not.toHaveBeenCalled();
  });

  it('pages through audit entries without exceeding the provider page limit', async () => {
    let entry = (id: string, date: number) => ({
      _id: id,
      date,
      name: id,
      target: { resources: ['proj/storefront:env/production:flag/checkout'] }
    });
    let firstPage = Array.from({ length: 20 }, (_, index) =>
      entry(`entry-${index}`, 2_000 - index)
    );
    clientMocks.getAuditLogEntries
      .mockResolvedValueOnce({ items: firstPage })
      .mockResolvedValueOnce({ items: [entry('entry-20', 1_980)] });

    let result = await (flagChangeTrigger as any)._params.pollEvents({
      auth: { token: 'api-token' },
      state: { lastTimestamp: 1_000 }
    });

    expect(clientMocks.getAuditLogEntries).toHaveBeenNthCalledWith(1, {
      limit: 20,
      spec: 'proj/*:env/*:flag/*',
      after: 1_000
    });
    expect(clientMocks.getAuditLogEntries).toHaveBeenNthCalledWith(2, {
      limit: 20,
      spec: 'proj/*:env/*:flag/*',
      after: 1_000,
      before: 1_981
    });
    expect(result.inputs).toHaveLength(21);
    expect(result.updatedState).toEqual({ lastTimestamp: 2_000 });
  });
});
