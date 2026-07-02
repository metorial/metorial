import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let vendorSchema = z.object({
  vendorId: z.string().describe('Unique identifier of the vendor'),
  companyName: z.string().nullable().optional().describe('Company name of the vendor'),
  email: z.string().nullable().optional().describe('Contact email'),
  phone: z.string().nullable().optional().describe('Contact phone'),
  status: z.string().optional().describe('Vendor status')
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listVendors({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let vendors = result.items.map((v: any) => ({
      vendorId: v.id,
      companyName: v.company_name ?? null,
      email: v.email ?? null,
      phone: v.phone ?? null,
      status: v.status
    }));

    return {
      output: {
        vendors,
        nextCursor: result.next_cursor
      },
      message: `Found **${vendors.length}** vendor(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
