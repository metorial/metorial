import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchDatabaseValues = SlateTool.create(spec, {
  name: 'Search Database Values',
  key: 'search_database_values',
  description: `Search and browse barcode values stored in a CodeREADr database. Filter by exact value, partial match, response text, or validity status. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to search'),
      value: z.string().optional().describe('Exact barcode value to find'),
      valueLike: z
        .string()
        .optional()
        .describe('Partial barcode value to search for (wildcard match)'),
      response: z.string().optional().describe('Exact response text to filter by'),
      responseLike: z.string().optional().describe('Partial response text to search for'),
      validity: z
        .enum(['0', '1'])
        .optional()
        .describe('Filter by validity status: "1" for valid, "0" for invalid'),
      limit: z.string().optional().describe('Maximum number of values to return'),
      offset: z.string().optional().describe('Number of values to skip for pagination')
    })
  )
  .output(
    z.object({
      count: z.string().describe('Total number of matching values'),
      values: z
        .array(
          z.object({
            value: z.string().describe('The barcode value'),
            response: z.string().describe('Response text displayed when scanned'),
            validity: z.string().describe('Validity status: "1" for valid, "0" for invalid')
          })
        )
        .describe('Matching barcode values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.showDatabaseValues(ctx.input.databaseId, {
      value: ctx.input.value,
      valueLike: ctx.input.valueLike,
      response: ctx.input.response,
      responseLike: ctx.input.responseLike,
      validity: ctx.input.validity,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: result,
      message: `Found **${result.count}** value(s) in database **${ctx.input.databaseId}**. Returned **${result.values.length}** value(s).`
    };
  })
  .build();
