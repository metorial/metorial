import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `Lists deals within a specific group in your Folk workspace. Returns deal names, associated contacts, and custom field values with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to list deals from'),
      objectType: z.string().describe('Deal object type name (e.g. "Deals")'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      deals: z
        .array(
          z.object({
            dealId: z.string(),
            name: z.string(),
            companies: z.array(
              z.object({
                companyId: z.string(),
                companyName: z.string()
              })
            ),
            people: z.array(
              z.object({
                personId: z.string(),
                personName: z.string()
              })
            ),
            customFieldValues: z.record(z.string(), z.unknown()),
            createdAt: z.string()
          })
        )
        .describe('List of deals'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDeals(ctx.input.groupId, ctx.input.objectType, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextCursor: string | null = null;
    if (result.pagination.nextLink) {
      let url = new URL(result.pagination.nextLink);
      nextCursor = url.searchParams.get('cursor');
    }

    return {
      output: {
        deals: result.items.map(d => ({
          dealId: d.id,
          name: d.name,
          companies: d.companies.map(c => ({ companyId: c.id, companyName: c.name })),
          people: d.people.map(p => ({ personId: p.id, personName: p.fullName })),
          customFieldValues: d.customFieldValues,
          createdAt: d.createdAt
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** deals${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
