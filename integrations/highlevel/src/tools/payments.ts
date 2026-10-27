import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const orderSchema = z
  .object({
    _id: z.string().describe('Order identifier.'),
    altId: z.string().describe('Sub-account identifier.'),
    altType: z.string().describe('Account type.'),
    contactId: z.string().optional().describe('Associated contact identifier.'),
    currency: z.string().optional().describe('Order currency.'),
    amount: z.number().optional().describe('Order value.'),
    status: z.string().describe('Provider order status.'),
    createdAt: z.string().describe('Creation timestamp.'),
    updatedAt: z.string().describe('Last modification timestamp.'),
    liveMode: z.boolean().optional().describe('Whether this is a live order.'),
    fulfillmentStatus: z.string().optional().describe('Provider fulfillment status.')
  })
  .passthrough();

const transactionSchema = z
  .object({
    _id: z.string().describe('Transaction identifier.'),
    altId: z.string().describe('Sub-account identifier.'),
    altType: z.string().describe('Account type.'),
    contactId: z.string().optional().describe('Associated contact identifier.'),
    currency: z.string().optional().describe('Transaction currency.'),
    amount: z
      .union([z.string(), z.number()])
      .optional()
      .describe('Provider amount, preserved without numeric rounding.'),
    status: z.string().optional().describe('Provider transaction status.'),
    createdAt: z.string().optional().describe('Creation timestamp.'),
    updatedAt: z.string().optional().describe('Last modification timestamp.')
  })
  .passthrough();

export const paymentsGetOrderByIdTool = SlateTool.create(spec, {
  key: 'payments_get_order_by_id',
  name: 'Get Payment Order',
  description:
    'Retrieve an order and its payment and fulfillment status in the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('payments/orders.readonly'))
  .input(z.object({ orderId: z.string().min(1).describe('HighLevel order identifier.') }))
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      orderId: z.string().describe('Order identifier.'),
      status: z.string().describe('Provider order status.'),
      order: orderSchema.describe('Order details, including provider-specific fields.')
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const order = await client.request<z.infer<typeof orderSchema>>({
      method: 'GET',
      path: `/payments/orders/${encodeURIComponent(ctx.input.orderId)}`,
      scope: 'payments/orders.readonly',
      query: { altId: client.locationId, locationId: client.locationId }
    });
    client.assertLocation(order.altId);
    return {
      output: {
        locationId: client.locationId,
        orderId: order._id,
        status: order.status,
        order
      },
      message: 'Retrieved payment order.'
    };
  })
  .build();

export const paymentsListTransactionsTool = SlateTool.create(spec, {
  key: 'payments_list_transactions',
  name: 'List Payment Transactions',
  description: 'List one page of payment transactions belonging to the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('payments/transactions.readonly'))
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe('Maximum transactions in this page; capped at 100 by this tool.'),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Zero-based result offset; use nextOffset for another page.'),
      paymentMode: z.string().optional().describe('Provider payment mode filter.'),
      startAt: z
        .string()
        .optional()
        .describe('Provider start date or timestamp for the transaction interval.'),
      endAt: z
        .string()
        .optional()
        .describe('Provider end date or timestamp for the transaction interval.'),
      entitySourceType: z.string().optional().describe('Transaction source type.'),
      entitySourceSubType: z.string().optional().describe('Transaction source subtype.'),
      search: z.string().optional().describe('Transaction name search text.'),
      subscriptionId: z.string().optional().describe('Subscription identifier filter.'),
      entityId: z.string().optional().describe('Source entity identifier filter.'),
      contactId: z
        .string()
        .optional()
        .describe('Contact identifier filter; discover contacts with contacts_get_contacts.')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      transactions: z.array(transactionSchema).describe('One page of transactions.'),
      totalCount: z.number().describe('Total transactions matching the filters.'),
      limit: z.number().describe('Requested page size.'),
      offset: z.number().describe('Current result offset.'),
      nextOffset: z
        .number()
        .optional()
        .describe('Next result offset when more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{
      data: z.infer<typeof transactionSchema>[];
      totalCount: number;
    }>({
      method: 'GET',
      path: '/payments/transactions',
      scope: 'payments/transactions.readonly',
      query: pickDefined({
        ...ctx.input,
        altId: client.locationId,
        altType: 'location',
        locationId: client.locationId
      })
    });
    for (const transaction of result.data) client.assertLocation(transaction.altId);
    const nextOffset = ctx.input.offset + result.data.length;
    return {
      output: {
        locationId: client.locationId,
        transactions: result.data,
        totalCount: result.totalCount,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        nextOffset:
          result.data.length > 0 && nextOffset < result.totalCount ? nextOffset : undefined
      },
      message: `Retrieved ${result.data.length} payment transactions.`
    };
  })
  .build();

export const paymentsTools = [paymentsGetOrderByIdTool, paymentsListTransactionsTool];
