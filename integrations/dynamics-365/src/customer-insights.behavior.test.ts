import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let dataverseMocks = vi.hoisted(() => ({
  listRecords: vi.fn(),
  listAllRecords: vi.fn()
}));

vi.mock('@slates/microsoft-dataverse-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/microsoft-dataverse-recipes')>();

  return {
    ...actual,
    createDataverseClientFromContext: vi.fn(() => ({
      listRecords: dataverseMocks.listRecords,
      listAllRecords: dataverseMocks.listAllRecords
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
        authenticationMethodId: 'oauth_organizations',
        output: {
          dataverseToken: 'test-token',
          dataverseInstanceUrl: 'https://example.crm.dynamics.com'
        }
      }
    }
  });

describe('list_customer_insights_records', () => {
  beforeEach(() => {
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.listAllRecords.mockReset();
  });

  it('keeps dynamic Customer Insights tables unselected and applies the default top only without pageSize', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null
    });
    let client = createClient();

    await client.invokeTool('customer_insights_list_records', {
      resourceType: 'customer_profile'
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith(
      'msdynci_customerprofiles',
      expect.objectContaining({
        select: undefined,
        top: 50,
        pageSize: undefined
      })
    );
  });

  it('does not send a default $top when pageSize drives Dataverse paging', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink:
        'https://example.crm.dynamics.com/api/data/v9.2/msdynci_customerprofiles?$skiptoken=abc'
    });
    let client = createClient();

    await client.invokeTool('customer_insights_list_records', {
      resourceType: 'customer_profile',
      pageSize: 25
    });

    let call = dataverseMocks.listRecords.mock.calls[0];
    expect(call).toBeDefined();
    let options = call?.[1];
    expect(options).toMatchObject({
      select: undefined,
      pageSize: 25
    });
    expect(options.top).toBeUndefined();
  });

  it('rejects incompatible top and pageSize inputs', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('customer_insights_list_records', {
          resourceType: 'segment',
          top: 10,
          pageSize: 10
        }),
      'Use either top'
    );
    expect(dataverseMocks.listRecords).not.toHaveBeenCalled();
  });

  it('rejects query changes when continuing from nextLink', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('customer_insights_list_records', {
          resourceType: 'segment',
          nextLink:
            'https://example.crm.dynamics.com/api/data/v9.2/msdynci_segments?$skiptoken=abc',
          filter: 'statecode eq 0'
        }),
      'Do not combine nextLink with filter'
    );
    expect(dataverseMocks.listRecords).not.toHaveBeenCalled();
  });

  it('rejects a blank nextLink before invoking Dataverse', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('customer_insights_list_records', {
          resourceType: 'segment',
          nextLink: '   '
        }),
      'nextLink is required'
    );
    expect(dataverseMocks.listRecords).not.toHaveBeenCalled();
  });
});

describe('export_segment_members', () => {
  beforeEach(() => {
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.listAllRecords.mockReset();
  });

  it('builds the documented segment-name filter and preserves additional filter precedence', async () => {
    dataverseMocks.listAllRecords.mockResolvedValueOnce({
      records: [
        {
          msdynci_customerid: 'customer-1',
          msdynci_segments: '["Male_under_40"]'
        }
      ],
      nextLink: null,
      pagesRead: 1,
      complete: true
    });
    let client = createClient();

    let result = await client.invokeTool('customer_insights_export_segment_members', {
      segmentName: 'Male_under_40',
      filter: "msdynci_customerid eq 'customer-1'",
      exportFormat: 'json'
    });

    expect(dataverseMocks.listAllRecords).toHaveBeenCalledWith(
      'msdynci_segmentmemberships',
      expect.objectContaining({
        filter:
          `(contains(msdynci_segments,'"Male_under_40"')) and ` +
          `(msdynci_customerid eq 'customer-1')`
      })
    );
    expect(result.output).toMatchObject({
      entitySetName: 'msdynci_segmentmemberships',
      recordCount: 1,
      complete: true,
      attachmentCount: 1
    });
  });

  it('requires an explicit tenant-specific column when filtering by segmentId', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('customer_insights_export_segment_members', {
          segmentId: '22222222-2222-2222-2222-222222222222'
        }),
      'segmentFilterColumn is required'
    );
    expect(dataverseMocks.listAllRecords).not.toHaveBeenCalled();
  });

  it('uses the caller-provided segment lookup column when segmentId is tenant-specific', async () => {
    dataverseMocks.listAllRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null,
      pagesRead: 1,
      complete: true
    });
    let client = createClient();

    await client.invokeTool('customer_insights_export_segment_members', {
      segmentId: '22222222-2222-2222-2222-222222222222',
      segmentFilterColumn: '_custom_segmentid_value'
    });

    expect(dataverseMocks.listAllRecords).toHaveBeenCalledWith(
      'msdynci_segmentmemberships',
      expect.objectContaining({
        filter: '(_custom_segmentid_value eq 22222222-2222-2222-2222-222222222222)'
      })
    );
  });
});
