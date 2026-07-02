import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let adjustInventory = SlateTool.create(spec, {
  name: 'Adjust Inventory',
  key: 'adjust_inventory',
  description: `Make inventory changes such as adjustments, physical counts, or transfers. Supports batch operations for multiple catalog items and locations simultaneously.`
})
  .input(
    z.object({
      changes: z
        .array(
          z.object({
            type: z
              .enum(['PHYSICAL_COUNT', 'ADJUSTMENT', 'TRANSFER'])
              .describe('Type of inventory change'),
            physicalCount: z
              .object({
                catalogObjectId: z.string(),
                locationId: z.string(),
                quantity: z.string(),
                state: z.string(),
                occurredAt: z.string().describe('RFC 3339 timestamp')
              })
              .optional()
              .describe('Required for PHYSICAL_COUNT type'),
            adjustment: z
              .object({
                catalogObjectId: z.string(),
                locationId: z.string(),
                quantity: z.string(),
                fromState: z.string(),
                toState: z.string(),
                occurredAt: z.string().describe('RFC 3339 timestamp')
              })
              .optional()
              .describe('Required for ADJUSTMENT type'),
            transfer: z
              .object({
                catalogObjectId: z.string(),
                fromLocationId: z.string(),
                toLocationId: z.string(),
                quantity: z.string(),
                state: z.string(),
                occurredAt: z.string().describe('RFC 3339 timestamp')
              })
              .optional()
              .describe('Required for TRANSFER type')
          })
        )
        .describe('List of inventory changes to apply'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate changes. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      counts: z.array(
        z.object({
          catalogObjectId: z.string().optional(),
          locationId: z.string().optional(),
          state: z.string().optional(),
          quantity: z.string().optional(),
          calculatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let changes = ctx.input.changes.map(c => ({
      type: c.type,
      physical_count: c.physicalCount
        ? {
            catalog_object_id: c.physicalCount.catalogObjectId,
            location_id: c.physicalCount.locationId,
            quantity: c.physicalCount.quantity,
            state: c.physicalCount.state,
            occurred_at: c.physicalCount.occurredAt
          }
        : undefined,
      adjustment: c.adjustment
        ? {
            catalog_object_id: c.adjustment.catalogObjectId,
            location_id: c.adjustment.locationId,
            quantity: c.adjustment.quantity,
            from_state: c.adjustment.fromState,
            to_state: c.adjustment.toState,
            occurred_at: c.adjustment.occurredAt
          }
        : undefined,
      transfer: c.transfer
        ? {
            catalog_object_id: c.transfer.catalogObjectId,
            from_location_id: c.transfer.fromLocationId,
            to_location_id: c.transfer.toLocationId,
            quantity: c.transfer.quantity,
            state: c.transfer.state,
            occurred_at: c.transfer.occurredAt
          }
        : undefined
    }));

    let result = await client.batchChangeInventory({
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      changes
    });

    let counts = result.counts.map(c => ({
      catalogObjectId: c.catalog_object_id,
      locationId: c.location_id,
      state: c.state,
      quantity: c.quantity,
      calculatedAt: c.calculated_at
    }));

    return {
      output: { counts },
      message: `Applied **${ctx.input.changes.length}** inventory change(s). Updated **${counts.length}** count(s).`
    };
  })
  .build();
