import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

let quantitySchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Quantity must be a nonnegative decimal string');

export let adjustInventory = SlateTool.create(spec, {
  name: 'Adjust Inventory',
  key: 'adjust_inventory',
  description:
    'Apply physical counts or inventory adjustments to item variations. Use ADJUSTMENT with different source and destination locations to move stock between locations.'
})
  .scopes(allOf('INVENTORY_WRITE'))
  .input(
    z.object({
      changes: z
        .array(
          z.object({
            type: z.enum(['PHYSICAL_COUNT', 'ADJUSTMENT']).describe('Inventory change type'),
            physicalCount: z
              .object({
                catalogObjectId: z.string().describe('Item variation ID from search_catalog'),
                locationId: z.string().describe('Location ID from list_locations'),
                quantity: quantitySchema,
                state: z.string(),
                occurredAt: z.string().describe('RFC 3339 timestamp'),
                referenceId: z.string().optional()
              })
              .optional()
              .describe('Required only for PHYSICAL_COUNT'),
            adjustment: z
              .object({
                catalogObjectId: z.string().describe('Item variation ID from search_catalog'),
                fromLocationId: z.string().describe('Source location ID from list_locations'),
                toLocationId: z
                  .string()
                  .describe(
                    'Destination location ID from list_locations; use the same ID for a single-location adjustment'
                  ),
                quantity: quantitySchema,
                fromState: z.string(),
                toState: z.string(),
                occurredAt: z.string().describe('RFC 3339 timestamp'),
                referenceId: z.string().optional()
              })
              .optional()
              .describe('Required only for ADJUSTMENT')
          })
        )
        .min(1)
        .max(100)
        .describe('1-100 inventory changes to apply'),
      ignoreUnchangedCounts: z
        .boolean()
        .optional()
        .describe(
          'Ignore physical counts unchanged since the previous count; defaults to true'
        ),
      idempotencyKey: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .describe('Unique key to prevent duplicate changes. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      counts: z.array(
        z.object({
          catalogObjectId: z.string().optional(),
          catalogObjectType: z.string().optional(),
          locationId: z.string().optional(),
          state: z.string().optional(),
          quantity: z.string().optional(),
          calculatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    for (let [index, change] of ctx.input.changes.entries()) {
      if (change.type === 'PHYSICAL_COUNT') {
        if (!change.physicalCount || change.adjustment) {
          throw squareServiceError(
            `changes[${index}] must contain physicalCount only for PHYSICAL_COUNT.`
          );
        }
      } else if (!change.adjustment || change.physicalCount) {
        throw squareServiceError(
          `changes[${index}] must contain adjustment only for ADJUSTMENT.`
        );
      }
      if (change.adjustment && Number(change.adjustment.quantity) <= 0) {
        throw squareServiceError(
          `changes[${index}].adjustment.quantity must be greater than zero.`
        );
      }
    }

    let changes = ctx.input.changes.map(change => ({
      type: change.type,
      physical_count: change.physicalCount
        ? {
            catalog_object_id: change.physicalCount.catalogObjectId,
            location_id: change.physicalCount.locationId,
            quantity: change.physicalCount.quantity,
            state: change.physicalCount.state,
            occurred_at: change.physicalCount.occurredAt,
            reference_id: change.physicalCount.referenceId
          }
        : undefined,
      adjustment: change.adjustment
        ? {
            catalog_object_id: change.adjustment.catalogObjectId,
            from_location_id: change.adjustment.fromLocationId,
            to_location_id: change.adjustment.toLocationId,
            quantity: change.adjustment.quantity,
            from_state: change.adjustment.fromState,
            to_state: change.adjustment.toState,
            occurred_at: change.adjustment.occurredAt,
            reference_id: change.adjustment.referenceId
          }
        : undefined
    }));
    requireSquareScopes(ctx.auth, ['INVENTORY_WRITE']);
    let client = createClient(ctx.auth);
    let result = await client.batchChangeInventory({
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      ignoreUnchangedCounts: ctx.input.ignoreUnchangedCounts,
      changes
    });
    let counts = result.counts.map(count => ({
      catalogObjectId: count.catalog_object_id,
      catalogObjectType: count.catalog_object_type,
      locationId: count.location_id,
      state: count.state,
      quantity: count.quantity,
      calculatedAt: count.calculated_at
    }));
    return {
      output: { counts },
      message: `Applied **${ctx.input.changes.length}** inventory change(s). Updated **${counts.length}** count(s).`
    };
  })
  .build();
