import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let finOpsMocks = vi.hoisted(() => ({
  exportToPackage: vi.fn(),
  getExecutionSummaryStatus: vi.fn(),
  listDataEntityAll: vi.fn()
}));

vi.mock('@slates/dynamics-finops-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/dynamics-finops-recipes')>();

  return {
    ...actual,
    createDynamicsFinOpsClient: vi.fn(() => ({
      exportToPackage: finOpsMocks.exportToPackage,
      getExecutionSummaryStatus: finOpsMocks.getExecutionSummaryStatus,
      listDataEntityAll: finOpsMocks.listDataEntityAll
    }))
  };
});

import { provider } from './index';

let createClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'microsoft_client_credentials',
        output: {
          finOpsToken: 'test-token',
          finOpsBaseUrl: 'https://contoso.operations.dynamics.com'
        }
      }
    }
  });

describe('Dynamics 365 Finance list tools', () => {
  beforeEach(() => {
    finOpsMocks.exportToPackage.mockReset();
    finOpsMocks.getExecutionSummaryStatus.mockReset();
    finOpsMocks.listDataEntityAll.mockReset();
  });

  it('treats limit as a total record maximum, not only a page size', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [
        {
          JournalBatchNumber: 'JB-001',
          Description: 'Accruals',
          dataAreaId: 'USMF'
        }
      ],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient();
    let result = await client.invokeTool('finance_list_journals', {
      limit: 1,
      maxPages: 3,
      legalEntity: 'USMF'
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'LedgerJournalHeaders',
      expect.objectContaining({
        top: 1,
        crossCompany: true,
        legalEntity: 'USMF'
      }),
      expect.objectContaining({
        maxPages: 3,
        pageSize: 1,
        maxItems: 1,
        dataAreaIdField: undefined
      })
    );
    expect(result.output.journals).toHaveLength(1);
  });

  it('applies configured legal entity with cross-company for company-scoped lists', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [
        {
          CustomerAccount: 'C-001',
          OrganizationName: 'Contoso',
          dataAreaId: 'USRT'
        }
      ],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createLocalSlateTestClient({
      slate: provider,
      state: {
        config: {
          finOpsDefaultLegalEntity: 'usrt'
        },
        auth: {
          authenticationMethodId: 'microsoft_client_credentials',
          output: {
            finOpsToken: 'test-token',
            finOpsBaseUrl: 'https://contoso.operations.dynamics.com'
          }
        }
      }
    });
    let result = await client.invokeTool('finance_list_customers', {
      limit: 1
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'CustomersV3',
      expect.objectContaining({
        crossCompany: true,
        legalEntity: 'usrt'
      }),
      expect.objectContaining({
        dataAreaIdField: undefined
      })
    );
    expect(result.output.customers[0].legalEntity).toBe('USRT');
  });
});

describe('run_data_management_package_operation', () => {
  beforeEach(() => {
    finOpsMocks.exportToPackage.mockReset();
    finOpsMocks.getExecutionSummaryStatus.mockReset();
    finOpsMocks.listDataEntityAll.mockReset();
  });

  it('generates a pollable execution ID when export receives a blank executionId', async () => {
    finOpsMocks.exportToPackage.mockResolvedValueOnce('returned-exec-1');

    let client = createClient();
    let result = await client.invokeTool('finance_run_data_management_package_operation', {
      action: 'export_to_package',
      definitionGroupId: 'Customers export',
      packageName: 'customers.zip',
      executionId: '   '
    });

    expect(finOpsMocks.exportToPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: expect.stringMatching(/^finance-export-/)
      })
    );
    expect(result.output.executionId).toBe('returned-exec-1');
  });

  it('does not mark unknown Data Management status as terminal', async () => {
    finOpsMocks.getExecutionSummaryStatus.mockResolvedValueOnce({
      rawStatus: 'Unknown',
      status: 'unknown',
      isTerminal: true,
      isSuccess: false
    });

    let client = createClient();
    let result = await client.invokeTool('finance_run_data_management_package_operation', {
      action: 'get_execution_summary_status',
      executionId: 'exec-1'
    });

    expect(result.output).toMatchObject({
      status: 'unknown',
      isTerminal: false,
      isSuccess: false
    });
  });
});
