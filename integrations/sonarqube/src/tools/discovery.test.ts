import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SonarQubeClient } from '../lib/client';
import { listProjectBranchesTool } from './discovery';

afterEach(() => {
  vi.restoreAllMocks();
});

const branchResponse = {
  items: [
    {
      name: 'main',
      isMain: true,
      type: 'LONG',
      branchId: 'long-1',
      status: { qualityGateStatus: 'OK' }
    },
    {
      name: 'feature/checkout',
      isMain: false,
      type: 'SHORT',
      branchId: 'short-1',
      mergeBranch: 'main',
      status: { qualityGateStatus: 'WARN' }
    },
    {
      name: 'develop',
      isMain: false,
      type: 'BRANCH',
      branchId: 'server-1'
    }
  ],
  page: undefined
};

describe('SonarQube branch discovery tool', () => {
  it('exposes an exact top-level object schema with optional branchTypes', () => {
    let schema = z.toJSONSchema(listProjectBranchesTool.inputSchema) as {
      type?: string;
      properties?: Record<
        string,
        {
          type?: string;
          enum?: string[];
          description?: string;
        }
      >;
      required?: string[];
    };

    expect(
      listProjectBranchesTool.inputSchema.safeParse({
        projectKey: 'app',
        branchTypes: 'SHORT'
      }).success
    ).toBe(true);
    expect(schema.type).toBe('object');
    expect(schema.properties?.branchTypes).toMatchObject({
      type: 'string',
      description:
        'Filter branches by type. ALL (default) returns all analyzed branches; LONG returns long-lived branches only; SHORT returns short-lived branches only.'
    });
    expect(schema.properties?.branchTypes?.enum).toBeUndefined();
    expect(schema.properties?.projectKey?.description).toContain(
      'Use search_my_sonarqube_projects first'
    );
    expect(schema.required ?? []).not.toContain('branchTypes');
  });

  it.each([
    { branchTypes: undefined, expectedNames: ['main', 'feature/checkout', 'develop'] },
    { branchTypes: 'ALL' as const, expectedNames: ['main', 'feature/checkout', 'develop'] },
    { branchTypes: 'LONG' as const, expectedNames: ['main', 'develop'] },
    { branchTypes: 'SHORT' as const, expectedNames: ['feature/checkout'] }
  ])('applies the $branchTypes branchTypes filter after fetching', async ({
    branchTypes,
    expectedNames
  }) => {
    let listProjectBranches = vi
      .spyOn(SonarQubeClient.prototype, 'listProjectBranches')
      .mockResolvedValue(branchResponse);

    let result = await listProjectBranchesTool.handleInvocation({
      auth: { token: 'token' },
      config: {
        deployment: 'cloud',
        organization: 'acme'
      },
      input: {
        projectKey: 'app',
        branchTypes
      }
    } as never);

    expect(listProjectBranches).toHaveBeenCalledWith('app');
    expect(result.output.branches.map((branch: { name: string }) => branch.name)).toEqual(
      expectedNames
    );
    expect(result.output.totalBranches).toBe(expectedNames.length);
  });

  it('preserves the merge target on short-lived Cloud branches', async () => {
    vi.spyOn(SonarQubeClient.prototype, 'listProjectBranches').mockResolvedValue(
      branchResponse
    );

    let result = await listProjectBranchesTool.handleInvocation({
      auth: { token: 'token' },
      config: {
        deployment: 'cloud',
        organization: 'acme'
      },
      input: {
        projectKey: 'app',
        branchTypes: 'SHORT'
      }
    } as never);

    expect(result.output.branches).toEqual([
      expect.objectContaining({
        name: 'feature/checkout',
        type: 'SHORT',
        mergeBranch: 'main'
      })
    ]);
  });

  it('rejects unsupported branchTypes before making an upstream request', async () => {
    let listProjectBranches = vi.spyOn(SonarQubeClient.prototype, 'listProjectBranches');

    await expect(
      listProjectBranchesTool.handleInvocation({
        auth: { token: 'token' },
        config: {
          deployment: 'cloud',
          organization: 'acme'
        },
        input: {
          projectKey: 'app',
          branchTypes: 'INVALID'
        }
      } as never)
    ).rejects.toThrow('branchTypes must be one of ALL, LONG, or SHORT.');

    expect(listProjectBranches).not.toHaveBeenCalled();
  });
});
