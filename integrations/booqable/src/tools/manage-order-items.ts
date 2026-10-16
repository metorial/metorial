import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireValue, validateNumber } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let manageOrderItems = SlateTool.create(spec, {
  name: 'Manage Order Items',
  key: 'manage_order_items',
  description:
    'Book a product quantity or specific stock items onto an order, then record pickups and returns. Use list_product_variations for product IDs, manage_stock for stock IDs, and get_order for planning IDs.',
  instructions: [
    'Booking defaults to infer_planning, which adds to an existing planning for the same product or creates one.',
    'For pickups and returns, supply planningId and either quantity or stockItemIds. Partial pickups and returns are supported.',
    'Use stockItemIds to pick up specific tracked items. Product quantity actions let Booqable select stock items.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      orderId: z.string().describe('Order ID from get_order or create_order'),
      action: z
        .enum(['book', 'start', 'stop'])
        .describe('Book items, record pickup, or record return'),
      productId: z.string().describe('Product variation ID from list_product_variations'),
      planningId: z
        .string()
        .optional()
        .describe(
          'Required for start, stop, or booking in update_existing mode; discover it with get_order'
        ),
      quantity: z
        .number()
        .optional()
        .describe('Positive whole quantity; supply this or stockItemIds'),
      stockItemIds: z
        .array(z.string())
        .optional()
        .describe('Specific tracked stock IDs from manage_stock; supply this or quantity'),
      mode: z
        .enum(['create_new', 'update_existing', 'infer_planning'])
        .optional()
        .describe('Booking mode; omit for start and stop'),
      confirmShortage: z
        .boolean()
        .optional()
        .describe('Explicitly confirm shortage warnings when booking or picking up items')
    })
  )
  .output(
    z.object({
      fulfillment: z.record(z.string(), z.any()),
      order: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    requireValue(ctx.input.orderId, 'Order ID');
    requireValue(ctx.input.productId, 'Product ID');
    let hasStockItems = ctx.input.stockItemIds !== undefined;
    if (hasStockItems === (ctx.input.quantity !== undefined)) {
      throw createApiServiceError('Provide either quantity or stockItemIds.');
    }
    validateNumber(ctx.input.quantity, 'Quantity', { integer: true, min: 1 });
    if (hasStockItems) {
      if (!ctx.input.stockItemIds?.length)
        throw createApiServiceError('Provide at least one stock item ID.');
      for (let id of ctx.input.stockItemIds) requireValue(id, 'Stock item ID');
      if (new Set(ctx.input.stockItemIds).size !== ctx.input.stockItemIds.length)
        throw createApiServiceError('Stock item IDs must be unique.');
    }
    if (ctx.input.action !== 'book' && ctx.input.mode !== undefined)
      throw createApiServiceError('mode is only used when booking.');
    if (ctx.input.action === 'stop' && ctx.input.confirmShortage !== undefined)
      throw createApiServiceError('confirmShortage is not used when returning items.');
    if (ctx.input.action !== 'book' || ctx.input.mode === 'update_existing')
      requireValue(ctx.input.planningId, 'Planning ID');
    let action = pickDefined({
      action: `${ctx.input.action}_${hasStockItems ? 'stock_items' : 'product'}`,
      product_id: ctx.input.productId,
      planning_id: ctx.input.planningId,
      quantity: ctx.input.quantity,
      stock_item_ids: ctx.input.stockItemIds,
      mode: ctx.input.action === 'book' ? (ctx.input.mode ?? 'infer_planning') : undefined
    });
    let client = new Client(buildClientConfig(ctx));
    let response = await client.createResource(
      'order_fulfillments',
      'order_fulfillments',
      pickDefined({
        order_id: ctx.input.orderId,
        actions: [action],
        confirm_shortage: ctx.input.confirmShortage
      })
    );
    let orderResponse = await client.getOrder(ctx.input.orderId, [
      'lines.planning.stock_item_plannings.stock_item'
    ]);
    let order = flattenSingleResource(orderResponse);
    return {
      output: { fulfillment: flattenSingleResource(response), order },
      message: `Completed ${ctx.input.action} for order ${ctx.input.orderId} (status: ${order?.status}).`
    };
  })
  .build();
