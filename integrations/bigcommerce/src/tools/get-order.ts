import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve full details of a single order by ID, including products, shipping addresses, totals, status, payment information, and transactions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The ID of the order to retrieve'),
      includeProducts: z
        .boolean()
        .optional()
        .describe('Whether to also fetch the order line items/products'),
      includeShipments: z
        .boolean()
        .optional()
        .describe('Whether to also fetch order shipments'),
      includeTransactions: z
        .boolean()
        .optional()
        .describe('Whether to also fetch order transactions')
    })
  )
  .output(
    z.object({
      order: z.any().describe('The order object'),
      products: z.array(z.any()).optional().describe('Order line items if requested'),
      shipments: z.array(z.any()).optional().describe('Order shipments if requested'),
      transactions: z.array(z.any()).optional().describe('Order transactions if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let order = await client.getOrder(ctx.input.orderId);

    let products: any[] | undefined;
    let shipments: any[] | undefined;
    let transactions: any[] | undefined;

    if (ctx.input.includeProducts) {
      products = await client.getOrderProducts(ctx.input.orderId);
    }

    if (ctx.input.includeShipments) {
      shipments = await client.listOrderShipments(ctx.input.orderId);
    }

    if (ctx.input.includeTransactions) {
      let txResult = await client.getOrderTransactions(ctx.input.orderId);
      transactions = txResult.data;
    }

    return {
      output: {
        order,
        products,
        shipments,
        transactions
      },
      message: `Retrieved order #${order.id} (status: ${order.status}, total: ${order.total_inc_tax}).`
    };
  })
  .build();
