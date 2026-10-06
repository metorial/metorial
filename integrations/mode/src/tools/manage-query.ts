import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient, requireToken } from '../lib/client';
import { getEmbedded, normalizeQuery } from '../lib/helpers';
import { spec } from '../spec';

let queryOutputSchema = z.object({
  queryToken: z.string().describe('Unique token of the query'),
  name: z.string().describe('Name of the query'),
  rawQuery: z.string().describe('The SQL query text'),
  dataSourceId: z.number().describe('ID of the associated data source'),
  createdAt: z.string().describe('ISO 8601 timestamp when the query was created'),
  updatedAt: z.string().describe('ISO 8601 timestamp when the query was last updated')
});

export let manageQuery = SlateTool.create(spec, {
  name: 'Manage Query',
  key: 'manage_query',
  description: `Create, update, list, or delete SQL queries within a Mode report.
Use **create** to add a new SQL query to a report.
Use **update** to modify an existing query's SQL, name, or data source.
Use **list** to get all queries in a report.
Use **delete** to remove a query from a report.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'list', 'delete']).describe('Action to perform'),
      reportToken: z.string().describe('Token of the report containing the query'),
      queryToken: z
        .string()
        .optional()
        .describe('Token of the query (required for update/delete)'),
      name: z.string().optional().describe('Name of the query (create/update)'),
      rawQuery: z.string().optional().describe('SQL query text (create/update)'),
      dataSourceId: z
        .number()
        .optional()
        .describe('ID of the data source to run the query against (create/update)')
    })
  )
  .output(
    z.object({
      queries: z
        .array(queryOutputSchema)
        .optional()
        .describe('List of queries (for list action)'),
      query: queryOutputSchema
        .optional()
        .describe('The created/updated query (for create/update actions)')
    })
  )
  .handleInvocation(async ctx => {
    const client = ModeClient.fromContext(ctx);

    let { action, reportToken } = ctx.input;

    if (action === 'list') {
      let data = await client.listQueries(reportToken);
      let queries = getEmbedded(data, 'queries').map(normalizeQuery);
      return {
        output: { queries },
        message: `Found **${queries.length}** queries in report.`
      };
    }

    if (action === 'create') {
      if (ctx.input.rawQuery === undefined || ctx.input.dataSourceId === undefined)
        throw createApiServiceError(
          'Provide rawQuery and dataSourceId when creating a query.'
        );
      let raw = await client.createQuery(reportToken, {
        rawQuery: ctx.input.rawQuery,
        dataSourceId: ctx.input.dataSourceId,
        name: ctx.input.name
      });
      let query = normalizeQuery(raw);
      return {
        output: { query },
        message: `Created query **${query.name || query.queryToken}**.`
      };
    }

    if (action === 'update') {
      let raw = await client.updateQuery(
        reportToken,
        requireToken(ctx.input.queryToken, 'queryToken'),
        {
          rawQuery: ctx.input.rawQuery,
          dataSourceId: ctx.input.dataSourceId,
          name: ctx.input.name
        }
      );
      let query = normalizeQuery(raw);
      return {
        output: { query },
        message: `Updated query **${query.name || query.queryToken}**.`
      };
    }

    // action === 'delete'
    let existing = await client.getQuery(
      reportToken,
      requireToken(ctx.input.queryToken, 'queryToken')
    );
    let query = normalizeQuery(existing);
    await client.deleteQuery(reportToken, requireToken(ctx.input.queryToken, 'queryToken'));
    return {
      output: { query },
      message: `Deleted query **${query.name || query.queryToken}**.`
    };
  })
  .build();
