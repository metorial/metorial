import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let performQueryTool = SlateTool.create(spec, {
  name: 'Perform Query',
  key: 'perform_query',
  description: `Execute a query on a connected IFTTT service to retrieve data. Queries let you fetch additional data from connected services, such as retrieving device states, listing items, or getting current values. Supports pagination with cursor-based navigation.`,
  instructions: [
    'The user must have the connection enabled.',
    'Query fields vary by service — use Get Connection to discover available queries and their field requirements.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection containing the query'),
      queryId: z
        .string()
        .describe('The query identifier (e.g., "weather.current_conditions")'),
      userId: z.string().describe('The user ID to run the query for'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Query field values specific to the query being run'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 50)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous query response')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID'),
      queryId: z.string().describe('The query that was executed'),
      items: z.any().describe('The query result items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth.token);
    let result = await client.performQuery(
      ctx.input.connectionId,
      ctx.input.queryId,
      ctx.input.userId,
      ctx.input.fields,
      ctx.input.limit,
      ctx.input.cursor
    );

    return {
      output: {
        connectionId: ctx.input.connectionId,
        queryId: ctx.input.queryId,
        items: result
      },
      message: `Performed query **${ctx.input.queryId}** on connection **${ctx.input.connectionId}** for user **${ctx.input.userId}**.`
    };
  })
  .build();
