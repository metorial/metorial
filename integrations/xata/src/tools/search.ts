import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Run a free-text search across a single table or the entire database branch. Powered by the Elasticsearch-based search engine with support for fuzziness, column boosting, and filters. Results are ranked by relevancy.`,
  instructions: [
    'Table-level search supports filters and column boosters for fine-tuned relevancy.',
    'Branch-level search (no tableName) searches across all tables simultaneously.',
    'Search runs against the eventually consistent search store.'
  ],
  constraints: ['Available on Pro and Enterprise plans only.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z
        .string()
        .optional()
        .describe('Table to search in. If omitted, searches across all tables in the branch.'),
      query: z.string().describe('Free-text search query'),
      fuzziness: z
        .number()
        .optional()
        .describe('Fuzziness level (0-2). Higher values allow more typo tolerance.'),
      filter: z
        .any()
        .optional()
        .describe('Filter object to narrow results (table-level search only)'),
      boosters: z
        .array(z.any())
        .optional()
        .describe('Column boosters to influence relevancy ranking (table-level search only)'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            table: z
              .string()
              .optional()
              .describe('Table the record belongs to (branch-level search)'),
            record: z.any().describe('The matching record'),
            highlight: z.any().optional().describe('Highlighted matching fragments')
          })
        )
        .describe('Search results ranked by relevancy'),
      totalCount: z.number().optional().describe('Total number of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    if (ctx.input.tableName) {
      let result = await client.searchTable(
        ctx.input.databaseName,
        branch,
        ctx.input.tableName,
        {
          query: ctx.input.query,
          filter: ctx.input.filter,
          fuzziness: ctx.input.fuzziness,
          boosters: ctx.input.boosters,
          page: ctx.input.pageSize ? { size: ctx.input.pageSize } : undefined
        }
      );

      let results = (result.records || []).map((r: any) => ({
        record: r,
        highlight: r.xata?.highlight
      }));

      return {
        output: {
          results,
          totalCount: result.totalCount
        },
        message: `Found **${results.length}** result(s) in **${ctx.input.tableName}** for query "${ctx.input.query}".`
      };
    }

    let result = await client.searchBranch(ctx.input.databaseName, branch, {
      query: ctx.input.query,
      fuzziness: ctx.input.fuzziness
    });

    let results = (result.records || []).map((r: any) => ({
      table: r.table,
      record: r.record,
      highlight: r.record?.xata?.highlight
    }));

    return {
      output: {
        results,
        totalCount: result.totalCount
      },
      message: `Found **${results.length}** result(s) across all tables for query "${ctx.input.query}".`
    };
  })
  .build();
