import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateId } from '../lib/client';
import { spec } from '../spec';

export let manageTransaction = SlateTool.create(spec, {
  name: 'Manage Transaction',
  key: 'manage_transaction',
  description:
    'Partially update or delete an inventory transaction. Call get_transaction first and pass its latest revision to detect concurrent edits. Updates may replace all line items; transaction type cannot be changed.',
  constraints: [
    'Stock In/Out use toLocationId for their single stock location. fromLocationId is only valid for Move Stock.',
    'partnerId is only valid for Stock In/Out; transactionTime is unsupported for Adjust Stock.',
    'Deletes are soft deletions; repeating a delete returns a provider error.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['update', 'delete']),
      transactionId: z
        .number()
        .describe('Transaction ID from list_transactions or get_transaction'),
      revision: z
        .number()
        .int()
        .nonnegative()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe(
          'Latest revision from get_transaction; strongly recommended to prevent lost updates'
        ),
      memo: z
        .string()
        .max(2000)
        .optional()
        .describe(
          'New memo for update, or audit memo for delete; empty string clears on update'
        ),
      transactionTime: z
        .string()
        .optional()
        .describe(
          'Update only: ISO 8601 effective time, not in the future; unavailable for Adjust Stock'
        ),
      fromLocationId: z
        .number()
        .optional()
        .describe('Update only: Move Stock source from list_locations'),
      toLocationId: z
        .number()
        .optional()
        .describe(
          'Update only: stock location, or Move Stock destination, from list_locations'
        ),
      partnerId: z
        .number()
        .nullable()
        .optional()
        .describe('Update only: Stock In/Out partner from list_partners; null clears it'),
      items: z
        .array(z.object({ itemId: z.number(), quantity: z.number() }))
        .min(1)
        .optional()
        .describe(
          'Update only: replaces all line items; positive for in/move, negative for out, signed for adjust'
        )
    })
  )
  .output(
    z.object({
      action: z.enum(['update', 'delete']),
      transactionId: z.number(),
      raw: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let changes = pickDefined({
      tx_time: input.transactionTime,
      from_location_id: input.fromLocationId,
      to_location_id: input.toLocationId,
      partner_id: input.partnerId,
      items: input.items?.map(item => ({ item_id: item.itemId, quantity: item.quantity }))
    });
    if (input.action === 'delete' && Object.keys(changes).length > 0)
      throw createApiServiceError(
        'Delete accepts only transactionId, revision, and memo in addition to action.'
      );
    if (
      input.action === 'update' &&
      Object.keys(changes).length === 0 &&
      input.memo === undefined
    )
      throw createApiServiceError('Provide at least one field to update.');
    for (let [label, id] of Object.entries({
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      partnerId: input.partnerId
    }))
      if (id != null) validateId(id, label);
    if (
      input.transactionTime !== undefined &&
      (!z.iso.datetime({ offset: true }).safeParse(input.transactionTime).success ||
        Date.parse(input.transactionTime) > Date.now())
    )
      throw createApiServiceError(
        'transactionTime must be an ISO 8601 datetime that is not in the future.'
      );
    input.items?.forEach(item => {
      validateId(item.itemId, 'itemId');
      if (!Number.isFinite(item.quantity))
        throw createApiServiceError('Each replacement quantity must be a finite number.');
    });
    if (
      input.items &&
      new Set(input.items.map(item => item.itemId)).size !== input.items.length
    )
      throw createApiServiceError('Each item may appear only once per transaction.');
    let body = pickDefined({ ...changes, revision: input.revision, memo: input.memo });
    let client = new Client({ token: ctx.auth.token });
    let result =
      input.action === 'update'
        ? await client.updateTransaction(input.transactionId, body)
        : await client.deleteTransaction(input.transactionId, body);
    return {
      output: { action: input.action, transactionId: input.transactionId, raw: result },
      message: `Transaction ${input.transactionId}: ${input.action} completed.`
    };
  })
  .build();
