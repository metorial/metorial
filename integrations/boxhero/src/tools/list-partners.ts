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
            name: z.string().describe('Partner name')
          })
        )
        .describe('List of suppliers and customers'),
      hasMore: z.boolean().describe('Whether more partners are available'),
      cursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listPartners({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let partners = response.items.map(p => ({
      partnerId: p.id,
      name: p.name
    }));

    return {
      output: {
        partners,
        hasMore: response.has_more,
        cursor: response.cursor
      },
      message: `Retrieved ${partners.length} partner(s).${response.has_more ? ' More available — use the cursor for the next page.' : ''}`
    };
  })
  .build();
