import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientMocks = vi.hoisted(() => ({
  batchUpsertObjects: vi.fn(),
  createObject: vi.fn(),
  deleteObject: vi.fn(),
  executeView: vi.fn(),
  getObject: vi.fn(),
  getSchema: vi.fn(),
  listObjects: vi.fn(),
  listUsers: vi.fn(),
  listViews: vi.fn(),
  triggerSkillWebhook: vi.fn(),
  updateObject: vi.fn()
}));

vi.mock('./lib/client', () => ({
  Client: vi.fn(() => clientMocks)
}));

import { batchUpsertObjects } from './tools/batch-upsert-objects';
import { createObject } from './tools/create-object';
import { deleteObject } from './tools/delete-object';
import { executeView } from './tools/execute-view';
import { getObject } from './tools/get-object';
import { getSchema } from './tools/get-schema';
import { listUsers } from './tools/list-users';
import { listViews } from './tools/list-views';
import { triggerSkillWebhook } from './tools/trigger-skill-webhook';
import { updateObject } from './tools/update-object';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const invocation = (input: Record<string, unknown>) =>
  ({ input, auth: { token: 'item-key' } }) as never;

describe('Item tool validation and response mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ objectType: 'contacts' }, 'exactly one locator'],
    [{ objectType: 'contacts', objectId: 1, email: 'ada@example.com' }, 'exactly one locator'],
    [{ objectType: 'companies', email: 'ada@example.com' }, 'supported only'],
    [{ objectType: 'deals', objectId: 1, includeSummary: true }, 'contacts and companies']
  ])('rejects incompatible get_object input locally', async (input, message) => {
    await expect(getObject.handleInvocation(invocation(input))).rejects.toThrow(message);
    expect(clientMocks.getObject).not.toHaveBeenCalled();
  });

  it('rejects no-op updates, including an empty fields object', async () => {
    await expect(
      updateObject.handleInvocation(
        invocation({ objectType: 'contacts', objectId: 1, fields: {} })
      )
    ).rejects.toThrow('Provide at least one update');
    expect(clientMocks.updateObject).not.toHaveBeenCalled();
  });

  it.each([
    [
      { name: 'Ada', matchBy: 'email' },
      'objects[0].matchBy and objects[0].matchValue must be provided together'
    ],
    [
      { name: 'Ada', matchBy: 'id', matchValue: 0 },
      'objects[0].matchValue must be a positive integer'
    ],
    [
      { name: 'Ada', matchBy: 'email', matchValue: 'not-an-email' },
      'objects[0].matchValue must be a valid email address'
    ],
    [
      { name: 'Ada', matchBy: 'name', matchValue: ' ' },
      'objects[0].matchValue must be a non-empty string'
    ]
  ])('reports the invalid batch row and remediation', async (row, message) => {
    await expect(
      batchUpsertObjects.handleInvocation(
        invocation({ objectType: 'contacts', objects: [row] })
      )
    ).rejects.toThrow(message);
    expect(clientMocks.batchUpsertObjects).not.toHaveBeenCalled();
  });

  it('rejects email matching outside contacts', async () => {
    await expect(
      batchUpsertObjects.handleInvocation(
        invocation({
          objectType: 'companies',
          objects: [{ name: 'Acme', matchBy: 'email', matchValue: 'hello@acme.com' }]
        })
      )
    ).rejects.toThrow('supported only for contacts');
  });

  it('returns a deduplication-neutral create result with the record ID additively', async () => {
    clientMocks.createObject.mockResolvedValueOnce({ id: 42, name: 'Ada' });

    let result = await createObject.handleInvocation(
      invocation({ objectType: 'contacts', name: 'Ada' })
    );

    expect(result.output).toEqual({ objectRecord: { id: 42, name: 'Ada' }, objectId: 42 });
    expect(result.message).toContain('Saved a record');
    expect(result.message).not.toContain('Created');
  });

  it('preserves delete success and adds target identity', async () => {
    clientMocks.deleteObject.mockResolvedValueOnce({ success: true });

    let result = await deleteObject.handleInvocation(
      invocation({ objectType: 'companies', objectId: 17 })
    );

    expect(result.output).toEqual({ success: true, objectId: 17, objectType: 'companies' });
  });

  it('uses an honest partial-failure batch summary and remediation message', async () => {
    clientMocks.batchUpsertObjects.mockResolvedValueOnce({
      results: [
        { id: 10, status: 'created' },
        { id: null, status: 'failed', error: 'Invalid field' }
      ],
      summary: { total: 2, created: 1, updated: 0, failed: 1 }
    });

    let result = await batchUpsertObjects.handleInvocation(
      invocation({ objectType: 'contacts', objects: [{ name: 'Ada' }, { name: 'Lin' }] })
    );

    expect(result.output.summary).toEqual({ total: 2, created: 1, updated: 0, failed: 1 });
    expect(result.message).toContain('1** failed');
    expect(result.message).toContain('Review the failed rows');
  });

  it('maps every documented numeric and relationship schema field', async () => {
    clientMocks.getSchema.mockResolvedValueOnce([
      {
        id: 1,
        slug: 'deals',
        display_name: 'Deals',
        fields: [
          {
            field_name: 'amount',
            display_name: 'Amount',
            field_type: 'currency',
            field_order: 2,
            is_required: false,
            related_object_type_id: 3,
            relationship_type: 'many_to_one',
            number_min: 0,
            number_max: 1000,
            number_decimal_places: 2,
            currency_decimal_places: 4
          }
        ]
      }
    ]);

    let result = await getSchema.handleInvocation(invocation({}));

    expect(result.output.objectTypes[0]?.fields[0]).toMatchObject({
      fieldOrder: 2,
      relatedObjectTypeId: 3,
      relationshipType: 'many_to_one',
      numberMin: 0,
      numberMax: 1000,
      numberDecimalPlaces: 2,
      currencyDecimalPlaces: 4
    });
  });

  it('maps documented UUID and enum contracts for users and views', async () => {
    clientMocks.listUsers.mockResolvedValueOnce([
      { id: uuid, full_name: 'Ada', access_level: 'admin' }
    ]);
    clientMocks.listViews.mockResolvedValueOnce([
      { id: uuid, name: 'Active', view_type: 'kanban', columns: [] }
    ]);

    let users = await listUsers.handleInvocation(invocation({}));
    let views = await listViews.handleInvocation(invocation({ objectType: 'contacts' }));

    expect(users.output.users).toEqual([
      { userId: uuid, fullName: 'Ada', accessLevel: 'admin' }
    ]);
    expect(views.output.views).toEqual([
      { viewId: uuid, name: 'Active', viewType: 'kanban', columns: [] }
    ]);
  });

  it('guarantees the requested view ID when the success response omits view metadata', async () => {
    clientMocks.executeView.mockResolvedValueOnce({ data: [], view: undefined });

    let result = await executeView.handleInvocation(
      invocation({ objectType: 'contacts', viewId: uuid })
    );

    expect(result.output.viewId).toBe(uuid);
    expect(result.output.objectRecords).toEqual([]);
  });

  it('keeps webhook signing optional while returning the required UUID run ID', async () => {
    clientMocks.triggerSkillWebhook.mockResolvedValueOnce({
      success: true,
      skillRunId: uuid,
      message: 'Accepted'
    });

    let result = await triggerSkillWebhook.handleInvocation(
      invocation({ skillId: uuid, payload: { event: 'created' } })
    );

    expect(clientMocks.triggerSkillWebhook).toHaveBeenCalledWith(
      uuid,
      { event: 'created' },
      { signPayload: undefined }
    );
    expect(result.output).toEqual({ success: true, skillRunId: uuid, message: 'Accepted' });
  });
});
