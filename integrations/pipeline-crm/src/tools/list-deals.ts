import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List and search deals in Pipeline CRM with optional filtering. Supports filtering by deal name, value range, and sorting. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 200, max: 200)'),
      dealName: z.string().optional().describe('Filter by deal name (partial match)'),
      valueFrom: z.number().optional().describe('Minimum deal value filter'),
      valueTo: z.number().optional().describe('Maximum deal value filter'),
      sort: z.string().optional().describe('Sort field (e.g., "name", "value", "created_at")')
    })
  )
  .output(
    z.object({
      deals: z
        .array(
          z.object({
            dealId: z.number().describe('Unique deal ID'),
            name: z.string().describe('Deal name'),
            value: z.number().nullable().optional().describe('Monetary value'),
            dealStageId: z.number().nullable().optional().describe('Pipeline stage ID'),
            userId: z.number().nullable().optional().describe('Owner user ID'),
            companyName: z.string().nullable().optional().describe('Associated company name'),
            expectedCloseDate: z
              .string()
              .nullable()
              .optional()
              .describe('Expected close date'),
            probability: z.number().nullable().optional().describe('Win probability'),
            createdAt: z.string().nullable().optional().describe('Creation timestamp'),
            updatedAt: z.string().nullable().optional().describe('Last update timestamp')
          })
        )
        .describe('List of deals'),
      totalCount: z.number().describe('Total number of matching deals'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let conditions: Record<string, any> = {};
    if (ctx.input.dealName) conditions.deal_name = ctx.input.dealName;
    if (ctx.input.valueFrom !== undefined)
      conditions['deal_value[from]'] = ctx.input.valueFrom;
    if (ctx.input.valueTo !== undefined) conditions['deal_value[to]'] = ctx.input.valueTo;

    let result = await client.listDeals({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      sort: ctx.input.sort
    });

    let deals = (result.entries ?? []).map((deal: any) => ({
      dealId: deal.id,
      name: deal.name,
      value: deal.value ?? null,
      dealStageId: deal.deal_stage_id ?? deal.stage_id ?? null,
      userId: deal.user_id ?? null,
      companyName: deal.company?.name ?? null,
      expectedCloseDate: deal.expected_close_date ?? null,
      probability: deal.probability ?? null,
      createdAt: deal.created_at ?? null,
      updatedAt: deal.updated_at ?? null
    }));

    return {
      output: {
        deals,
        totalCount: result.pagination?.total ?? deals.length,
        currentPage: result.pagination?.page ?? 1,
        totalPages: result.pagination?.pages ?? 1
      },
      message: `Found **${result.pagination?.total ?? deals.length}** deals (page ${result.pagination?.page ?? 1} of ${result.pagination?.pages ?? 1})`
    };
  })
  .build();
