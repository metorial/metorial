import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listVendors = SlateTool.create(spec, {
  name: 'List Vendors',
  key: 'list_vendors',
  description: `Lists vendors in MaintainX. Vendors supply parts and services, and can be linked to purchase orders, assets, and locations. For multi-organization keys, call list_organizations and pass organizationId.`,
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
      vendors: z
        .array(
          z.object({
            vendorId: z.number().describe('Vendor ID'),
            name: z.string().optional().describe('Vendor name'),
            email: z.string().optional().describe('Contact email'),
            phone: z.string().optional().describe('Contact phone'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of vendors'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.listVendors({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let vendors = (result.vendors ?? []).map((v: any) => ({
      vendorId: v.id ?? undefined,
      name: v.name ?? undefined,
      email: undefined,
      phone: undefined,
      createdAt: v.createdAt ?? undefined,
      updatedAt: v.updatedAt ?? undefined
    }));

    return {
      output: {
        vendors,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${vendors.length}** vendor(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
