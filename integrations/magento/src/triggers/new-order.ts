import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

export let newOrder = SlateTrigger.create(spec, {
  name: 'New Order',
  key: 'new_order',
  description:
    'Triggers when a new order is placed or an existing order is updated. Polls for recent orders and detects new and changed orders.'
})
  .input(
    z.object({
      orderId: z.number().describe('Order entity ID'),
      incrementId: z.string().optional().describe('Human-readable order number'),
      state: z.string().optional().describe('Order state'),
      status: z.string().optional().describe('Order status'),
      grandTotal: z.number().optional().describe('Grand total'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerFirstname: z.string().optional().describe('Customer first name'),
      customerLastname: z.string().optional().describe('Customer last name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      isNew: z.boolean().describe('Whether this is a brand new order or an updated one')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Order entity ID'),
      incrementId: z.string().optional().describe('Human-readable order number'),
      state: z.string().optional().describe('Order state'),
      status: z.string().optional().describe('Order status'),
      grandTotal: z.number().optional().describe('Grand total'),
      subtotal: z.number().optional().describe('Subtotal'),
      taxAmount: z.number().optional().describe('Tax amount'),
      shippingAmount: z.number().optional().describe('Shipping amount'),
      discountAmount: z.number().optional().describe('Discount amount'),
      totalQtyOrdered: z.number().optional().describe('Total items ordered'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerFirstname: z.string().optional().describe('Customer first name'),
      customerLastname: z.string().optional().describe('Customer last name'),
      customerId: z.number().optional().describe('Customer ID'),
      currencyCode: z.string().optional().describe('Order currency code'),
      createdAt: z.string().optional().describe('Order creation timestamp'),
      updatedAt: z.string().optional().describe('Order last update timestamp'),
      items: z
        .array(
          z.object({
            orderItemId: z.number().optional().describe('Item ID'),
            sku: z.string().optional().describe('Product SKU'),
            name: z.string().optional().describe('Product name'),
            qtyOrdered: z.number().optional().describe('Quantity ordered'),
            price: z.number().optional().describe('Item price'),
            rowTotal: z.number().optional().describe('Row total')
          })
        )
        .optional()
        .describe('Order line items')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MagentoClient({
        storeUrl: ctx.config.storeUrl,
        storeCode: ctx.config.storeCode,
        token: ctx.auth.token
      });

      let state = ctx.state as {
        lastUpdatedAt?: string;
        knownOrders?: Record<string, string>;
      } | null;
      let lastUpdatedAt = state?.lastUpdatedAt;
      let knownOrders = state?.knownOrders || {};

      let filters: Array<{ field: string; value: string; conditionType?: string }> = [];
      if (lastUpdatedAt) {
        filters.push({ field: 'updated_at', value: lastUpdatedAt, conditionType: 'gt' });
      }

      let result = await client.searchOrders({
        filters,
        sortField: 'updated_at',
        sortDirection: 'ASC',
        pageSize: 50
      });

      let inputs: Array<{
        orderId: number;
        incrementId?: string;
        state?: string;
        status?: string;
        grandTotal?: number;
        customerEmail?: string;
        customerFirstname?: string;
        customerLastname?: string;
        createdAt?: string;
        updatedAt?: string;
        isNew: boolean;
      }> = [];

      let newLastUpdatedAt = lastUpdatedAt;
      let updatedKnownOrders = { ...knownOrders };

      for (let order of result.items) {
        let orderIdStr = String(order.entity_id);
        let previousUpdatedAt = knownOrders[orderIdStr];
        let isNew = previousUpdatedAt === undefined;

        if (previousUpdatedAt !== undefined && previousUpdatedAt === order.updated_at) {
          continue;
        }

        inputs.push({
          orderId: order.entity_id!,
          incrementId: order.increment_id,
          state: order.state,
          status: order.status,
          grandTotal: order.grand_total,
          customerEmail: order.customer_email,
          customerFirstname: order.customer_firstname,
          customerLastname: order.customer_lastname,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          isNew
        });

        updatedKnownOrders[orderIdStr] = order.updated_at || '';
        if (order.updated_at && (!newLastUpdatedAt || order.updated_at > newLastUpdatedAt)) {
          newLastUpdatedAt = order.updated_at;
        }
      }

      return {
        inputs,
        updatedState: {
          lastUpdatedAt: newLastUpdatedAt,
          knownOrders: updatedKnownOrders
        }
      };
    },

    handleEvent: async ctx => {
      let client = new MagentoClient({
        storeUrl: ctx.config.storeUrl,
        storeCode: ctx.config.storeCode,
        token: ctx.auth.token
      });

      let fullOrder: any = {};
      try {
        fullOrder = await client.getOrder(ctx.input.orderId);
      } catch {
        // Use data from poll if full fetch fails
      }

      let eventType = ctx.input.isNew ? 'order.created' : 'order.updated';

      return {
        type: eventType,
        id: `order-${ctx.input.orderId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          orderId: ctx.input.orderId,
          incrementId: ctx.input.incrementId || fullOrder.increment_id,
          state: ctx.input.state || fullOrder.state,
          status: ctx.input.status || fullOrder.status,
          grandTotal: ctx.input.grandTotal ?? fullOrder.grand_total,
          subtotal: fullOrder.subtotal,
          taxAmount: fullOrder.tax_amount,
          shippingAmount: fullOrder.shipping_amount,
          discountAmount: fullOrder.discount_amount,
          totalQtyOrdered: fullOrder.total_qty_ordered,
          customerEmail: ctx.input.customerEmail || fullOrder.customer_email,
          customerFirstname: ctx.input.customerFirstname || fullOrder.customer_firstname,
          customerLastname: ctx.input.customerLastname || fullOrder.customer_lastname,
          customerId: fullOrder.customer_id,
          currencyCode: fullOrder.order_currency_code,
          createdAt: ctx.input.createdAt || fullOrder.created_at,
          updatedAt: ctx.input.updatedAt || fullOrder.updated_at,
          items: fullOrder.items?.map((i: any) => ({
            orderItemId: i.item_id,
            sku: i.sku,
            name: i.name,
            qtyOrdered: i.qty_ordered,
            price: i.price,
            rowTotal: i.row_total
          }))
        }
      };
    }
  })
  .build();
