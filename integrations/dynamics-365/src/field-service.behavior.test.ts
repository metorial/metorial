import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let dataverseMocks = vi.hoisted(() => ({
  createRecord: vi.fn(),
  listRecords: vi.fn(),
  updateRecord: vi.fn()
}));

vi.mock('@slates/microsoft-dataverse-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/microsoft-dataverse-recipes')>();

  return {
    ...actual,
    createDataverseClientFromContext: vi.fn(() => ({
      createRecord: dataverseMocks.createRecord,
      listRecords: dataverseMocks.listRecords,
      updateRecord: dataverseMocks.updateRecord
    }))
  };
});

import { provider } from './index';

let accountId = '11111111-1111-1111-1111-111111111111';
let bookingId = '22222222-2222-2222-2222-222222222222';
let resourceId = '33333333-3333-3333-3333-333333333333';
let workOrderId = '44444444-4444-4444-4444-444444444444';

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

beforeEach(() => {
  dataverseMocks.createRecord.mockReset();
  dataverseMocks.createRecord.mockResolvedValue({ bookableresourcebookingid: bookingId });
  dataverseMocks.listRecords.mockReset();
  dataverseMocks.listRecords.mockResolvedValue({ records: [], nextLink: null });
  dataverseMocks.updateRecord.mockReset();
  dataverseMocks.updateRecord.mockResolvedValue({ bookableresourcebookingid: bookingId });
});

describe('list_field_service_records', () => {
  it('uses the documented work order service estimate duration column', async () => {
    let client = createClient();

    await client.invokeTool('field_service_list_records', {
      resourceType: 'work_order_service',
      top: 1
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith(
      'msdyn_workorderservices',
      expect.objectContaining({
        select: expect.arrayContaining(['msdyn_estimateduration'])
      })
    );
    expect(dataverseMocks.listRecords.mock.calls[0]?.[1].select).not.toContain(
      'msdyn_estimatedduration'
    );
  });

  it('rejects top and pageSize because Dataverse ignores top with max page size', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('field_service_list_records', {
          resourceType: 'service_account',
          top: 1,
          pageSize: 1
        }),
      'Do not combine top and pageSize'
    );
    expect(dataverseMocks.listRecords).not.toHaveBeenCalled();
  });

  it('rejects nextLink with fresh query options', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('field_service_list_records', {
          resourceType: 'service_account',
          nextLink: 'https://example.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=abc',
          filter: 'name ne null'
        }),
      'nextLink must be used without additional query options'
    );
    expect(dataverseMocks.listRecords).not.toHaveBeenCalled();
  });
});

describe('schedule_booking', () => {
  it('rejects inverted booking times even when durationMinutes is supplied', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('field_service_schedule_booking', {
          workOrderId,
          resourceId,
          startTime: '2026-07-01T10:00:00Z',
          endTime: '2026-07-01T09:00:00Z',
          durationMinutes: 60,
          bookingStatusId: '55555555-5555-5555-5555-555555555555'
        }),
      'endTime must be later than startTime'
    );
    expect(dataverseMocks.createRecord).not.toHaveBeenCalled();
  });
});

describe('update_field_service_record', () => {
  it('rejects empty updates', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('field_service_update_record', {
          resourceType: 'service_account',
          recordId: accountId,
          recordData: {}
        }),
      'recordData must include at least one column'
    );
    expect(dataverseMocks.updateRecord).not.toHaveBeenCalled();
  });

  it('prevents accidental Dataverse upsert', async () => {
    let client = createClient();

    await client.invokeTool('field_service_update_record', {
      resourceType: 'service_account',
      recordId: accountId,
      recordData: { description: 'Updated' }
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'accounts',
      accountId,
      { description: 'Updated' },
      { returnRepresentation: undefined, preventCreate: true }
    );
  });
});

describe('update_booking', () => {
  it('rejects inverted booking times even when durationMinutes is supplied', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('field_service_update_booking', {
          bookingId,
          startTime: '2026-07-01T10:00:00Z',
          endTime: '2026-07-01T09:00:00Z',
          durationMinutes: 60
        }),
      'endTime must be later than startTime'
    );
    expect(dataverseMocks.updateRecord).not.toHaveBeenCalled();
  });

  it('updates existing bookings without allowing upsert', async () => {
    let client = createClient();

    await client.invokeTool('field_service_update_booking', {
      bookingId,
      resourceId,
      startTime: '2026-07-01T09:00:00Z',
      endTime: '2026-07-01T10:00:00Z'
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'bookableresourcebookings',
      bookingId,
      expect.objectContaining({
        'Resource@odata.bind': `/bookableresources(${resourceId})`,
        starttime: '2026-07-01T09:00:00Z',
        endtime: '2026-07-01T10:00:00Z',
        duration: 60
      }),
      { returnRepresentation: true, preventCreate: true }
    );
  });

  it('includes an explicit duration when updating booking times', async () => {
    let client = createClient();

    await client.invokeTool('field_service_update_booking', {
      bookingId,
      startTime: '2026-07-01T09:00:00Z',
      endTime: '2026-07-01T10:30:00Z',
      durationMinutes: 90
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'bookableresourcebookings',
      bookingId,
      expect.objectContaining({
        starttime: '2026-07-01T09:00:00Z',
        endtime: '2026-07-01T10:30:00Z',
        duration: 90
      }),
      { returnRepresentation: true, preventCreate: true }
    );
  });
});

describe('manage_work_order_lifecycle', () => {
  it('requires statusCode when stateCode is provided', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('field_service_manage_work_order_lifecycle', {
          lifecycleAction: 'mark_in_progress',
          workOrderId,
          stateCode: 0
        }),
      'statusCode is required when stateCode is provided'
    );
    expect(dataverseMocks.updateRecord).not.toHaveBeenCalled();
  });

  it('updates existing work orders without allowing upsert', async () => {
    let client = createClient();

    await client.invokeTool('field_service_manage_work_order_lifecycle', {
      lifecycleAction: 'mark_in_progress',
      workOrderId
    });

    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'msdyn_workorders',
      workOrderId,
      { msdyn_systemstatus: 690970002 },
      { returnRepresentation: true, preventCreate: true }
    );
  });
});
