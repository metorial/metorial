import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapVendor } from '../lib/schemas';
import { spec } from '../spec';

let vendorSchema = z.object({
  vendorId: z.string().describe('Unique identifier of the vendor'),
  companyName: z.string().nullable().optional().describe('Company name of the vendor'),
  email: z.string().nullable().optional().describe('Contact email'),
  phone: z.string().nullable().optional().describe('Contact phone'),
  status: z.string().nullish().describe('Vendor status')
});

export let listVendors = SlateTool.create(spec, {
  name: 'List Vendors',
  key: 'list_vendors',
  description: `List vendors in your Brex account. Vendors are counterparties for payments. Returns vendor details including company name and contact information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      vendors: z.array(vendorSchema).describe('List of vendors'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listVendors({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    const vendors = result.items.map(mapVendor);
    return {
      output: { vendors, nextCursor: result.next_cursor },
      message: `Returned ${vendors.length} vendors.`
    };
  })
  .build();
