import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listPurchaseOrders = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description: `Lists purchase orders from MaintainX. Purchase orders track item procurement from vendors, including quantities and pricing. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Limit must be a safe whole number')
        .min(1)
        .max(200)
        .optional()
        .describe('Max results per page (1-200, default 100)'),
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
    let client = Client.fromContext(ctx);

    let result = await client.listPurchaseOrders({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let purchaseOrders = (result.purchaseOrders ?? []).map((po: any) => ({
      purchaseOrderId: po.id ?? undefined,
      title: po.title ?? undefined,
      status: po.status ?? undefined,
      vendorId: po.vendorId ?? undefined,
      createdAt: po.createdAt ?? undefined,
      updatedAt: po.updatedAt ?? undefined
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
