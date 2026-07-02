import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderLineItemSchema = z.object({
  lineItemId: z.string().optional(),
  quantity: z.number().optional(),
  productIdentifier: z.string().optional(),
  description: z.string().optional(),
  productTaxCode: z.string().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  salesTax: z.number().optional()
});

export let newOrderTrigger = SlateTrigger.create(spec, {
  name: 'New Order Transaction',
  key: 'new_order',
  description:
    'Triggers when a new order transaction is created in TaxJar. Polls for new orders since the last check.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID of the order'),
      order: z.any().describe('Full order data from TaxJar')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction identifier'),
      transactionDate: z.string().optional().describe('Date of the transaction'),
      provider: z.string().optional().describe('Marketplace provider'),
      fromCountry: z.string().optional(),
      fromZip: z.string().optional(),
      fromState: z.string().optional(),
      fromCity: z.string().optional(),
      fromStreet: z.string().optional(),
      toCountry: z.string().optional(),
      toZip: z.string().optional(),
      toState: z.string().optional(),
      toCity: z.string().optional(),
      toStreet: z.string().optional(),
      amount: z.number().optional().describe('Total order amount'),
      shipping: z.number().optional().describe('Shipping cost'),
      salesTax: z.number().optional().describe('Sales tax collected'),
      lineItems: z.array(orderLineItemSchema).optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment,
        apiVersion: ctx.config.apiVersion
      });

      let now = new Date();
      let fromDate = ctx.state?.lastPolledDate
        ? (ctx.state.lastPolledDate as string)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      let toDate = now.toISOString().split('T')[0]!;

      let orderIds = await client.listOrders({
        from_transaction_date: fromDate,
        to_transaction_date: toDate
      });

      let knownIds = (ctx.state?.knownOrderIds as string[] | undefined) ?? [];
      let knownSet = new Set(knownIds);
      let newOrderIds = orderIds.filter(id => !knownSet.has(id));

      let inputs: Array<{ transactionId: string; order: any }> = [];

      for (let orderId of newOrderIds) {
        try {
          let order = await client.showOrder(orderId);
          inputs.push({
            transactionId: orderId,
            order
          });
        } catch (e) {
          ctx.warn(`Failed to fetch order ${orderId}: ${e}`);
        }
      }

      let updatedKnownIds = [...knownIds, ...newOrderIds].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPolledDate: toDate,
          knownOrderIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let order = ctx.input.order;

      return {
        type: 'order.created',
        id: ctx.input.transactionId,
        output: {
          transactionId: order.transaction_id,
          transactionDate: order.transaction_date,
          provider: order.provider,
          fromCountry: order.from_country,
          fromZip: order.from_zip,
          fromState: order.from_state,
          fromCity: order.from_city,
          fromStreet: order.from_street,
          toCountry: order.to_country,
          toZip: order.to_zip,
          toState: order.to_state,
          toCity: order.to_city,
          toStreet: order.to_street,
          amount: order.amount,
          shipping: order.shipping,
          salesTax: order.sales_tax,
          lineItems: order.line_items?.map((li: any) => ({
            lineItemId: li.id,
            quantity: li.quantity,
            productIdentifier: li.product_identifier,
            description: li.description,
            productTaxCode: li.product_tax_code,
            unitPrice: li.unit_price,
            discount: li.discount,
            salesTax: li.sales_tax
          }))
        }
      };
    }
  })
  .build();
