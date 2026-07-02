import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPortfolios = SlateTool.create(spec, {
  name: 'List Portfolios',
  key: 'list_portfolios',
  description: `Retrieve a paginated list of portfolios from VEO.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().default(20).describe('Number of portfolios per page'),
      pageNumber: z
        .number()
        .optional()
        .default(1)
        .describe('Page number to retrieve (1-based)'),
      orderByDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .default('DESC')
        .describe('Sort direction')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of portfolio objects'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      totalItemCount: z.number().describe('Total number of portfolios')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.listPortfolios({
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber,
      orderByDirection: ctx.input.orderByDirection
    });

    let items = result.Items ?? result.items ?? [];
    let totalItemCount = result.TotalItemCount ?? result.totalItemCount ?? 0;
    let page = result.Page ?? result.page ?? ctx.input.pageNumber;
    let pageSize = result.PageSize ?? result.pageSize ?? ctx.input.pageSize;

    return {
      output: { items, page, pageSize, totalItemCount },
      message: `Retrieved **${items.length}** portfolios (page ${page}, ${totalItemCount} total).`
    };
  })
  .build();
