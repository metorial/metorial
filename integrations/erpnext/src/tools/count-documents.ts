import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let countDocuments = SlateTool.create(spec, {
  name: 'Count Documents',
  key: 'count_documents',
  description: `Count the number of ERPNext documents matching a given DocType and optional filters. Useful for dashboards, summaries, and checking record counts without fetching full documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      doctype: z
        .string()
        .describe('The DocType to count (e.g., "Sales Order", "Customer", "Item")'),
      filters: z
        .any()
        .optional()
        .describe('Filters as a JSON object or array of [field, operator, value] tuples')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let totalCount = await client.getCount(ctx.input.doctype, ctx.input.filters);

    return {
      output: { totalCount },
      message: `Found **${totalCount}** ${ctx.input.doctype} document(s) matching the criteria`
    };
  })
  .build();
