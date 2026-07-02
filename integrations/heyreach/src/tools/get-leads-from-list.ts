import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLeadsFromList = SlateTool.create(spec, {
  name: 'Get Leads from List',
  key: 'get_leads_from_list',
  description: `Retrieve leads from a specific HeyReach lead list with optional filtering by keyword and date range. Returns paginated lead data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('The ID of the list to retrieve leads from'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Number of leads to return (default: 50)'),
      offset: z.number().optional().default(0).describe('Pagination offset (default: 0)'),
      keyword: z.string().optional().describe('Filter leads by keyword'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter leads created from this date (ISO 8601 format)'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter leads created until this date (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      leads: z.array(z.any()).describe('Array of lead objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLeadsFromList({
      listId: ctx.input.listId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      keyword: ctx.input.keyword,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo
    });

    let leads = Array.isArray(result) ? result : (result?.data ?? result?.items ?? []);

    return {
      output: { leads },
      message: `Retrieved **${leads.length}** lead(s) from list **${ctx.input.listId}**.`
    };
  })
  .build();
