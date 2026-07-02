import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPurchaseOrders = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description: `Lists purchase orders from MaintainX. Purchase orders track item procurement from vendors, including quantities and pricing.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      purchaseOrders: z
        .array(
          z.object({
            purchaseOrderId: z.number().describe('Purchase order ID'),
            title: z.string().optional().describe('Title'),
            status: z.string().optional().describe('Status'),
            vendorId: z.number().optional().describe('Vendor ID'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of purchase orders'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listPurchaseOrders({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let purchaseOrders = (result.purchaseOrders ?? []).map((po: any) => ({
      purchaseOrderId: po.id,
      title: po.title,
      status: po.status,
      vendorId: po.vendorId,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt
    }));

    return {
      output: {
        purchaseOrders,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${purchaseOrders.length}** purchase order(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
