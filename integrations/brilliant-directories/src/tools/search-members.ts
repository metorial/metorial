import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchMembers = SlateTool.create(spec, {
  name: 'Search Members',
  key: 'search_members',
  description: `Search for members in the directory using various criteria such as keyword, category, location, and date range.
Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Keyword search query.'),
      category: z.string().optional().describe('Category filter.'),
      address: z
        .string()
        .optional()
        .describe('Location/address filter for location-based searching.'),
      dateRange: z.string().optional().describe('Date range filter.'),
      limit: z.number().optional().describe('Number of results per page (20-100).'),
      page: z.string().optional().describe('Pagination token from a previous response.'),
      outputType: z
        .enum(['array', 'html'])
        .optional()
        .describe('Output format. Defaults to array.'),
      additionalFilters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional search filters as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      members: z.any().describe('The search results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.category) params.category = ctx.input.category;
    if (ctx.input.address) params.address = ctx.input.address;
    if (ctx.input.dateRange) params.daterange = ctx.input.dateRange;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.outputType) params.output_type = ctx.input.outputType;
    if (ctx.input.additionalFilters) {
      for (let [key, value] of Object.entries(ctx.input.additionalFilters)) {
        params[key] = value;
      }
    }

    let result = await client.searchUsers(params);

    return {
      output: {
        status: result.status,
        members: result.message
      },
      message: `Found members matching the search criteria.`
    };
  })
  .build();
