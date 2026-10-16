import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPartners = SlateTool.create(spec, {
  name: 'List Partners',
  key: 'list_partners',
  description: `Retrieve suppliers and customers from BoxHero. Partners are linked to inventory transactions — suppliers for Stock In and customers for Stock Out. Use partner IDs when creating transactions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .number()
        .optional()
        .describe('Partner type: 0 for suppliers, 1 for customers; omit for both'),
      limit: z.number().optional().describe('Maximum number of partners to return per page'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      partners: z
        .array(
          z.object({
            partnerId: z.number().describe('Unique partner ID'),
            name: z.string().describe('Partner name'),
            type: z.number().optional().describe('0 = supplier, 1 = customer'),
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
            memo: z.string().optional()
          })
        )
        .describe('List of suppliers and customers'),
      hasMore: z.boolean().describe('Whether more partners are available'),
      cursor: z.string().optional().describe('Cursor for the next page'),
      raw: z.unknown().optional().describe('Original page returned by BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listPartners({
      limit: ctx.input.limit,
      type: ctx.input.type,
      cursor: ctx.input.cursor
    });

    let partners = response.items.map(p => ({
      partnerId: p.id,
      name: p.name,
      type: p.type,
      phone: p.phone,
      email: p.email,
      address: p.address,
      memo: p.memo
    }));

    return {
      output: {
        partners,
        hasMore: response.has_more,
        cursor: response.cursor == null ? undefined : String(response.cursor),
        raw: response
      },
      message: `Retrieved ${partners.length} partner(s).${response.has_more ? ' More available — use the cursor for the next page.' : ''}`
    };
  })
  .build();
