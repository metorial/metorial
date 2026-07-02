import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let dataverseMocks = vi.hoisted(() => ({
  deleteRecord: vi.fn(),
  invokeOperation: vi.fn(),
  listRecords: vi.fn(),
  updateRecord: vi.fn()
}));

vi.mock('@slates/microsoft-dataverse-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/microsoft-dataverse-recipes')>();

  return {
    ...actual,
    createDataverseClientFromContext: vi.fn(() => ({
      deleteRecord: dataverseMocks.deleteRecord,
      invokeOperation: dataverseMocks.invokeOperation,
      listRecords: dataverseMocks.listRecords,
      updateRecord: dataverseMocks.updateRecord
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

describe('delete_sales_record', () => {
  beforeEach(() => {
    dataverseMocks.deleteRecord.mockReset();
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('deletes the selected sales record by entity set and GUID', async () => {
    dataverseMocks.deleteRecord.mockResolvedValueOnce(undefined);
    let client = createClient();

    let result = await client.invokeTool('sales_delete_record', {
      resourceType: 'account',
      recordId: 'account-1'
    });

    expect(dataverseMocks.deleteRecord).toHaveBeenCalledWith('accounts', 'account-1');
    expect(result.output).toEqual({
      resourceType: 'account',
      entitySetName: 'accounts',
      recordId: 'account-1',
      deleted: true
    });
  });

  it('rejects an empty recordId with ServiceError validation', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('sales_delete_record', {
          resourceType: 'account',
          recordId: ''
        }),
      'recordId is required'
    );
    expect(dataverseMocks.deleteRecord).not.toHaveBeenCalled();
  });
});

describe('list_sales_records', () => {
  beforeEach(() => {
    dataverseMocks.deleteRecord.mockReset();
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('uses Dataverse lookup value properties in default contact selects', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null
    });
    let client = createClient();

    await client.invokeTool('sales_list_records', {
      resourceType: 'contact'
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith('contacts', {
      select: [
        'contactid',
        'fullname',
        'emailaddress1',
        'telephone1',
        '_parentcustomerid_value',
        'statecode',
        'statuscode',
        'createdon',
        'modifiedon'
      ],
      filter: undefined,
      orderBy: undefined,
      expand: undefined,
      top: undefined,
      pageSize: undefined,
      nextLink: undefined,
      includeCount: undefined
    });
  });

  it('uses Dataverse lookup value properties in default opportunity selects', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null
    });
    let client = createClient();

    await client.invokeTool('sales_list_records', {
      resourceType: 'opportunity'
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith(
      'opportunities',
      expect.objectContaining({
        select: [
          'opportunityid',
          'name',
          '_customerid_value',
          'estimatedvalue',
          'estimatedclosedate',
          'statecode',
          'statuscode',
          'createdon',
          'modifiedon'
        ]
      })
    );
  });

  it('rejects top with pageSize before Dataverse ignores top during paging', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('sales_list_records', {
          resourceType: 'account',
          top: 5,
          pageSize: 2
        }),
      'Use either top or pageSize'
    );
    expect(dataverseMocks.listRecords).not.toHaveBeenCalled();
  });
});

describe('update_sales_record', () => {
  beforeEach(() => {
    dataverseMocks.deleteRecord.mockReset();
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('prevents accidental upserts when updating sales records', async () => {
    dataverseMocks.updateRecord.mockResolvedValueOnce({
      accountid: 'account-1',
      name: 'Updated account'
    });
    let client = createClient();

    await client.invokeTool('sales_update_record', {
      resourceType: 'account',
      recordId: 'account-1',
      recordData: {
        name: 'Updated account'
      }
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'accounts',
      'account-1',
      {
        name: 'Updated account'
      },
      {
        returnRepresentation: undefined,
        preventCreate: true
      }
    );
  });

  it('rejects empty update payloads with ServiceError validation', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('sales_update_record', {
          resourceType: 'account',
          recordId: 'account-1',
          recordData: {}
        }),
      'recordData must include at least one column'
    );
    expect(dataverseMocks.updateRecord).not.toHaveBeenCalled();
  });
});

describe('qualify_lead', () => {
  beforeEach(() => {
    dataverseMocks.deleteRecord.mockReset();
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('sends required QualifyLead booleans even when omitted by the caller', async () => {
    dataverseMocks.invokeOperation.mockResolvedValueOnce({
      CreatedEntities: []
    });
    let client = createClient();

    await client.invokeTool('sales_qualify_lead', {
      leadId: 'lead-1',
      statusCode: 3
    });

    expect(dataverseMocks.invokeOperation).toHaveBeenCalledWith({
      operationType: 'action',
      bindingType: 'entity',
      entitySetName: 'leads',
      recordKey: 'lead-1',
      operationName: 'QualifyLead',
      requestBody: {
        CreateAccount: false,
        CreateContact: false,
        CreateOpportunity: false,
        Status: 3
      }
    });
  });
});

describe('close_opportunity', () => {
  beforeEach(() => {
    dataverseMocks.deleteRecord.mockReset();
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('sends a typed opportunityclose entity payload', async () => {
    dataverseMocks.invokeOperation.mockResolvedValueOnce({});
    let client = createClient();

    await client.invokeTool('sales_close_opportunity', {
      closeAction: 'win',
      opportunityId: 'opportunity-1',
      statusCode: 3,
      subject: 'Won opportunity',
      actualRevenue: 1000
    });

    expect(dataverseMocks.invokeOperation).toHaveBeenCalledWith({
      operationType: 'action',
      operationName: 'WinOpportunity',
      requestBody: {
        OpportunityClose: {
          '@odata.type': 'Microsoft.Dynamics.CRM.opportunityclose',
          'opportunityid@odata.bind': '/opportunities(opportunity-1)',
          subject: 'Won opportunity',
          actualrevenue: 1000
        },
        Status: 3
      }
    });
  });
});
