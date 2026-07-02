import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIndices = SlateTool.create(spec, {
  name: 'Get AI Indices',
  key: 'get_indices',
  description: `Access Token Metrics' AI-based model portfolios (indices). Retrieve available indices, their current holdings and token weights, or historical performance data. Indices are available as **active** (frequently rebalanced) or **passive** (less frequent changes).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      queryType: z
        .enum(['list', 'holdings', 'performance'])
        .describe(
          'What to retrieve: list of indices, holdings of an index, or performance history'
        ),
      indicesType: z
        .enum(['active', 'passive'])
        .optional()
        .describe('Filter by index type (for list query)'),
      indexId: z
        .number()
        .optional()
        .describe('Index ID (required for holdings and performance queries)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (for performance query)'),
      endDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format (for performance query)'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      indices: z.array(z.record(z.string(), z.any())).describe('Array of index data records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.queryType === 'list') {
      result = await client.getIndices({
        indicesType: ctx.input.indicesType,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else if (ctx.input.queryType === 'holdings') {
      if (!ctx.input.indexId) {
        throw new Error('indexId is required for holdings query');
      }
      result = await client.getIndicesHoldings(ctx.input.indexId);
    } else {
      if (!ctx.input.indexId) {
        throw new Error('indexId is required for performance query');
      }
      result = await client.getIndicesPerformance({
        indexId: ctx.input.indexId,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let indices = result?.data ?? [];

    return {
      output: { indices },
      message: `Retrieved **${indices.length}** index ${ctx.input.queryType} record(s).`
    };
  })
  .build();
