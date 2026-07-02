import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageInventory = SlateTool.create(spec, {
  name: 'Manage Inventory',
  key: 'manage_inventory',
  description: `View and adjust stock levels for product variants. Use "retrieve" to get current stock levels, or "adjust" to modify quantities. Adjustments support incrementing, decrementing, setting exact quantities, or marking stock as unlimited.`,
  instructions: [
    'For "retrieve" action, either omit variantIds to list all inventory, or provide specific variant IDs',
    'For "adjust" action, provide at least one adjustment operation',
    'Each variant can only appear in one adjustment operation per request'
  ],
  constraints: [
    'Maximum 50 operations per adjustment request',
    'Adjustment quantities must be >= 1'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['retrieve', 'adjust'])
        .describe('Whether to retrieve inventory or adjust stock levels'),
      variantIds: z
        .array(z.string())
        .optional()
        .describe('Specific variant IDs to retrieve (for retrieve action)'),
      cursor: z.string().optional().describe('Pagination cursor for listing all inventory'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate adjustments (required for adjust action)'),
      incrementOperations: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            quantity: z.number().describe('Quantity to add')
          })
        )
        .optional()
        .describe('Increase stock for variants'),
      decrementOperations: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            quantity: z.number().describe('Quantity to subtract')
          })
        )
        .optional()
        .describe('Decrease stock for variants'),
      setFiniteOperations: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            quantity: z.number().describe('Exact quantity to set')
          })
        )
        .optional()
        .describe('Set exact stock quantities'),
      setUnlimitedOperations: z
        .array(z.string())
        .optional()
        .describe('Variant IDs to mark as unlimited stock')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      inventory: z.array(z.any()).optional().describe('Inventory items (for retrieve action)'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for next page'),
      adjusted: z.boolean().optional().describe('Whether adjustment was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'retrieve') {
      if (ctx.input.variantIds?.length) {
        let inventory = await client.getInventory(ctx.input.variantIds);
        return {
          output: {
            action: 'retrieved',
            inventory,
            hasNextPage: false
          },
          message: `Retrieved inventory for **${inventory.length}** variant(s).`
        };
      }

      let result = await client.listInventory(ctx.input.cursor);
      return {
        output: {
          action: 'retrieved',
          inventory: result.inventory,
          hasNextPage: result.pagination.hasNextPage,
          nextPageCursor: result.pagination.nextPageCursor
        },
        message: `Retrieved **${result.inventory.length}** inventory items.${result.pagination.hasNextPage ? ' More results available.' : ''}`
      };
    }

    if (ctx.input.action === 'adjust') {
      if (!ctx.input.idempotencyKey) {
        throw new Error('idempotencyKey is required for inventory adjustments');
      }

      let hasOperations =
        (ctx.input.incrementOperations?.length || 0) +
        (ctx.input.decrementOperations?.length || 0) +
        (ctx.input.setFiniteOperations?.length || 0) +
        (ctx.input.setUnlimitedOperations?.length || 0);

      if (!hasOperations) {
        throw new Error('At least one adjustment operation is required');
      }

      await client.adjustInventory(
        {
          incrementOperations: ctx.input.incrementOperations,
          decrementOperations: ctx.input.decrementOperations,
          setFiniteOperations: ctx.input.setFiniteOperations,
          setUnlimitedOperations: ctx.input.setUnlimitedOperations
        },
        ctx.input.idempotencyKey
      );

      return {
        output: {
          action: 'adjusted',
          adjusted: true
        },
        message: `Successfully adjusted inventory for **${hasOperations}** variant(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
