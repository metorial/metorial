import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let finOpsMocks = vi.hoisted(() => ({
  listDataEntityAll: vi.fn()
}));

vi.mock('@slates/dynamics-finops-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/dynamics-finops-recipes')>();

  return {
    ...actual,
    createDynamicsFinOpsClient: vi.fn(() => ({
      listDataEntityAll: finOpsMocks.listDataEntityAll
    }))
  };
});

import { provider } from './index';

let createClient = (config: Record<string, unknown> = {}) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config,
      auth: {
        authenticationMethodId: 'microsoft_client_credentials',
        output: {
          finOpsToken: 'test-token',
          finOpsBaseUrl: 'https://contoso.operations.dynamics.com'
        }
      }
    }
  });

describe('Dynamics 365 Human Resources list tools', () => {
  beforeEach(() => {
    finOpsMocks.listDataEntityAll.mockReset();
  });

  it('treats limit as a total record maximum, not only a page size', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [
        {
          PersonnelNumber: '000001',
          Name: 'Test Worker',
          dataAreaId: 'USMF'
        }
      ],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient();
    let result = await client.invokeTool('human_resources_list_employees', {
      limit: 1,
      maxPages: 3,
      legalEntity: 'USMF'
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'EmployeesV2',
      expect.objectContaining({
        top: 1,
        legalEntity: 'USMF',
        crossCompany: true,
        dataAreaId: undefined
      }),
      expect.objectContaining({
        maxPages: 3,
        pageSize: 1,
        maxItems: 1,
        dataAreaIdField: undefined
      })
    );
    expect(result.output.employees).toHaveLength(1);
  });

  it('applies the configured default legal entity to company-scoped lists', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient({ finOpsDefaultLegalEntity: 'usmf' });
    await client.invokeTool('human_resources_list_leave_requests', {
      limit: 5
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'LeaveRequests',
      expect.objectContaining({
        top: 5,
        legalEntity: 'usmf',
        crossCompany: true,
        dataAreaId: undefined
      }),
      expect.objectContaining({
        dataAreaIdField: undefined
      })
    );
  });

  it('treats compensation plans as legal-entity scoped records', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient();
    await client.invokeTool('human_resources_list_compensation_plans', {
      limit: 5,
      dataAreaId: 'usmf'
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'CompensationPlans',
      expect.objectContaining({
        top: 5,
        legalEntity: 'usmf',
        crossCompany: true,
        dataAreaId: undefined
      }),
      expect.objectContaining({
        dataAreaIdField: undefined
      })
    );
  });
});
