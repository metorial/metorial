import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let dataverseMocks = vi.hoisted(() => ({
  invokeOperation: vi.fn(),
  listRecords: vi.fn(),
  updateRecord: vi.fn()
}));

vi.mock('@slates/microsoft-dataverse-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/microsoft-dataverse-recipes')>();

  return {
    ...actual,
    createDataverseClientFromContext: vi.fn(() => ({
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

describe('manage_queue_item_workflow', () => {
  beforeEach(() => {
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('adds a case to a queue and exposes the created queue item id', async () => {
    dataverseMocks.invokeOperation.mockResolvedValueOnce({
      QueueItemId: 'queue-item-1'
    });
    let client = createClient();

    let result = await client.invokeTool('customer_service_manage_queue_item_workflow', {
      queueAction: 'add',
      queueId: 'queue-1',
      sourceQueueId: 'queue-0',
      targetEntityLogicalName: 'incident',
      targetRecordId: 'case-1',
      queueItemProperties: {
        priority: 1
      }
    });

    expect(result.output).toMatchObject({
      queueAction: 'add',
      queueItemId: 'queue-item-1'
    });
    expect(dataverseMocks.invokeOperation).toHaveBeenCalledWith({
      operationType: 'action',
      bindingType: 'entity',
      entitySetName: 'queues',
      recordKey: 'queue-1',
      operationName: 'AddToQueue',
      requestBody: {
        Target: {
          '@odata.type': 'Microsoft.Dynamics.CRM.incident',
          incidentid: 'case-1'
        },
        SourceQueue: {
          '@odata.type': 'Microsoft.Dynamics.CRM.queue',
          queueid: 'queue-0'
        },
        QueueItemProperties: {
          '@odata.type': 'Microsoft.Dynamics.CRM.queueitem',
          priority: 1
        }
      }
    });
  });

  it('routes a queue item to a team target', async () => {
    dataverseMocks.invokeOperation.mockResolvedValueOnce({});
    let client = createClient();

    await client.invokeTool('customer_service_manage_queue_item_workflow', {
      queueAction: 'route',
      queueItemId: 'queue-item-1',
      targetType: 'team',
      targetId: 'team-1'
    });

    expect(dataverseMocks.invokeOperation).toHaveBeenCalledWith({
      operationType: 'action',
      operationName: 'RouteTo',
      requestBody: {
        Target: {
          '@odata.type': 'Microsoft.Dynamics.CRM.team',
          teamid: 'team-1'
        },
        QueueItem: {
          '@odata.type': 'Microsoft.Dynamics.CRM.queueitem',
          queueitemid: 'queue-item-1'
        }
      }
    });
  });

  it('rejects action-specific missing inputs with ServiceError validation', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('customer_service_manage_queue_item_workflow', {
          queueAction: 'pick',
          queueItemId: 'queue-item-1'
        }),
      'assigneeUserId is required'
    );
    expect(dataverseMocks.invokeOperation).not.toHaveBeenCalled();
  });
});

describe('list_customer_service_records', () => {
  beforeEach(() => {
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('uses Dataverse lookup value properties in default case selects', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null
    });
    let client = createClient();

    await client.invokeTool('customer_service_list_records', {
      resourceType: 'case'
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith('incidents', {
      select: [
        'incidentid',
        'ticketnumber',
        'title',
        '_customerid_value',
        '_ownerid_value',
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

  it('uses Dataverse lookup value properties in default queue item selects', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null
    });
    let client = createClient();

    await client.invokeTool('customer_service_list_records', {
      resourceType: 'queue_item'
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith(
      'queueitems',
      expect.objectContaining({
        select: [
          'queueitemid',
          '_queueid_value',
          '_objectid_value',
          '_workerid_value',
          'enteredon',
          'statecode',
          'statuscode',
          'createdon',
          'modifiedon'
        ]
      })
    );
  });
});

describe('update_customer_service_record', () => {
  beforeEach(() => {
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('prevents accidental upserts when updating records', async () => {
    dataverseMocks.updateRecord.mockResolvedValueOnce({
      annotationid: 'note-1',
      notetext: 'Updated note'
    });
    let client = createClient();

    await client.invokeTool('customer_service_update_record', {
      resourceType: 'note',
      recordId: 'note-1',
      recordData: {
        notetext: 'Updated note'
      }
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'annotations',
      'note-1',
      {
        notetext: 'Updated note'
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
        client.invokeTool('customer_service_update_record', {
          resourceType: 'note',
          recordId: 'note-1',
          recordData: {}
        }),
      'recordData must include at least one column'
    );
    expect(dataverseMocks.updateRecord).not.toHaveBeenCalled();
  });
});

describe('manage_case_workflow', () => {
  beforeEach(() => {
    dataverseMocks.invokeOperation.mockReset();
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('assigns cases by updating ownerid rather than invoking deprecated Assign', async () => {
    dataverseMocks.updateRecord.mockResolvedValueOnce({
      incidentid: 'case-1',
      _ownerid_value: 'team-1'
    });
    let client = createClient();

    await client.invokeTool('customer_service_manage_case_workflow', {
      workflowAction: 'assign',
      caseId: 'case-1',
      assigneeType: 'team',
      assigneeId: 'team-1',
      additionalFields: {
        statuscode: 1
      }
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'incidents',
      'case-1',
      {
        statuscode: 1,
        'ownerid@odata.bind': '/teams(team-1)'
      },
      {
        returnRepresentation: true,
        preventCreate: true
      }
    );
    expect(dataverseMocks.invokeOperation).not.toHaveBeenCalled();
  });

  it('prevents accidental case creation when reopening a case', async () => {
    dataverseMocks.updateRecord.mockResolvedValueOnce({
      incidentid: 'case-1',
      statecode: 0,
      statuscode: 1
    });
    let client = createClient();

    await client.invokeTool('customer_service_manage_case_workflow', {
      workflowAction: 'reopen',
      caseId: 'case-1',
      statusCode: 1
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'incidents',
      'case-1',
      {
        statecode: 0,
        statuscode: 1
      },
      {
        returnRepresentation: true,
        preventCreate: true
      }
    );
  });
});
