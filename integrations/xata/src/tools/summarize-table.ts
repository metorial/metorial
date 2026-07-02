import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let summarizeTable = SlateTool.create(spec, {
  name: 'Summarize Table',
  key: 'summarize_table',
  description: `Run strongly consistent calculations (count, sum, average, min, max) on groups of data. Use this for real-time statistics and group-by operations without relying on the eventually consistent search store.`,
  instructions: [
    'Group by columns to break results into groups, e.g. ["status", "region"].',
    'Summaries define calculations, e.g. {"total": {"sum": "amount"}, "avgPrice": {"average": "price"}}.',
    'Filter narrows the dataset before grouping and summarizing.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table to summarize'),
      columns: z.array(z.string()).optional().describe('Columns to group by'),
      summaries: z
        .any()
        .optional()
        .describe(
          'Summary operations, e.g. {"total": {"sum": "amount"}, "count": {"count": "*"}}'
        ),
      filter: z
        .any()
        .optional()
        .describe('Filter object to narrow the dataset before summarizing'),
      sort: z.any().optional().describe('Sort specification for the summary results'),
      summariesFilter: z
        .any()
        .optional()
        .describe('Filter applied to the computed summary values'),
      pageSize: z.number().optional().describe('Number of summary groups to return')
    })
  )
  .output(
    z.object({
      summaries: z.array(z.any()).describe('Array of summary groups with computed values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result = await client.summarize(ctx.input.databaseName, branch, ctx.input.tableName, {
      columns: ctx.input.columns,
      summaries: ctx.input.summaries,
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      summariesFilter: ctx.input.summariesFilter,
      page: ctx.input.pageSize ? { size: ctx.input.pageSize } : undefined
    });

    let summaries = result.summaries || [];

    return {
      output: { summaries },
      message: `Computed **${summaries.length}** summary group(s) for **${ctx.input.tableName}**.`
    };
  })
  .build();

export let aggregateTable = SlateTool.create(spec, {
  name: 'Aggregate Table',
  key: 'aggregate_table',
  description: `Run analytics aggregations on a table using the search/analytics engine. Supports count, sum, average, min, max, unique count, date histograms, top values, percentiles, and nested sub-aggregations.`,
  instructions: [
    'Aggregation definitions follow Xata syntax, e.g. {"totalOrders": {"count": "*"}, "byStatus": {"topValues": {"column": "status", "size": 10}}}.',
    'Nested sub-aggregations can be specified via the "aggs" key inside a bucket aggregation.'
  ],
  constraints: [
    'Runs on the eventually consistent search store.',
    'Available on Pro and Enterprise plans only.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table to aggregate'),
      aggs: z.any().describe('Aggregation definitions object'),
      filter: z
        .any()
        .optional()
        .describe('Filter object to narrow the dataset before aggregation')
    })
  )
  .output(
    z.object({
      aggs: z.any().describe('Aggregation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result = await client.aggregate(ctx.input.databaseName, branch, ctx.input.tableName, {
      aggs: ctx.input.aggs,
      filter: ctx.input.filter
    });

    return {
      output: { aggs: result.aggs },
      message: `Aggregation completed for **${ctx.input.tableName}**.`
    };
  })
  .build();
