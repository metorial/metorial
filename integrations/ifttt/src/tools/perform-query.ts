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
        .describe(
          'Positive integer maximum number of results; defaults and maximums depend on the connected query'
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from a previous response; also pass its nextFields when present'
        ),
      userFeatureId: z
        .string()
        .optional()
        .describe(
          'Optional exact user feature ID from get_connection; omission uses the first native configuration'
        )
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID'),
      queryId: z.string().describe('The query that was executed'),
      items: z.any().describe('Native result items, or a native query ingredient object'),
      type: z.enum(['list', 'query']).optional().describe('Native response kind'),
      nextCursor: z.string().optional().describe('Native next-page cursor, absent at the end'),
      nextFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Native fields needed for the next-page request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth);
    let result = await client.performQuery(
      ctx.input.connectionId,
      ctx.input.queryId,
      ctx.input.userId,
      ctx.input.fields,
      ctx.input.limit,
      ctx.input.cursor,
      ctx.input.userFeatureId
    );

    return {
      output: {
        connectionId: ctx.input.connectionId,
        queryId: ctx.input.queryId,
        items: result.native.type === 'list' ? result.native.data : result.native,
        type: result.native.type as 'list' | 'query',
        nextCursor: result.nextCursor,
        nextFields: result.nextFields
      },
      message: `Performed query **${ctx.input.queryId}** on connection **${ctx.input.connectionId}** for user **${ctx.input.userId}**.`
    };
  })
  .build();
