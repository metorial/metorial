import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAttributeValuesTool = SlateTool.create(spec, {
  name: 'Get Attribute Values',
  key: 'get_attribute_values',
  description: `Retrieve the historical daily values for a specific attribute. Returns a paginated list of date/value pairs, allowing you to query extensive history for a single attribute with date range filtering.`,
  instructions: ['Use dateMin and dateMax (YYYY-MM-DD) to narrow the date range.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      attributeName: z
        .string()
        .describe('Name of the attribute to get values for (e.g. "steps", "sleep_minutes")'),
      dateMin: z.string().optional().describe('Earliest date to include (YYYY-MM-DD)'),
      dateMax: z.string().optional().describe('Latest date to include (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of values'),
      values: z
        .array(
          z.object({
            date: z.string().describe('Date in YYYY-MM-DD format'),
            value: z.union([z.number(), z.string(), z.null()]).describe('Value for the date')
          })
        )
        .describe('List of date/value pairs'),
      hasMore: z.boolean().describe('Whether there are more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.getAttributeValues({
      attribute: ctx.input.attributeName,
      dateMin: ctx.input.dateMin,
      dateMax: ctx.input.dateMax,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let values = result.results.map(v => ({ date: v.date, value: v.value }));

    return {
      output: {
        totalCount: result.count,
        values,
        hasMore: result.next !== null
      },
      message: `Retrieved **${values.length}** values for attribute **${ctx.input.attributeName}** (${result.count} total).`
    };
  })
  .build();
