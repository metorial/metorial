import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let dealSchema = z.object({
  dealId: z.number().describe('Deal ID'),
  title: z.string().describe('Deal title'),
  value: z.number().optional().describe('Deal value'),
  currency: z.string().optional().describe('Deal currency'),
  status: z.string().optional().describe('Deal status'),
  stageId: z.number().optional().describe('Current stage ID'),
  pipelineId: z.number().optional().describe('Pipeline ID'),
  personName: z.string().optional().nullable().describe('Linked person name'),
  organizationName: z.string().optional().nullable().describe('Linked organization name'),
  ownerName: z.string().optional().describe('Owner user name'),
  addTime: z.string().optional().describe('Creation timestamp'),
  updateTime: z.string().optional().nullable().describe('Last update timestamp'),
  expectedCloseDate: z.string().optional().nullable().describe('Expected close date'),
  stageOrderNr: z.number().optional().describe('Stage order number'),
  probability: z.number().optional().nullable().describe('Deal probability')
});

export let getDeals = SlateTool.create(spec, {
  name: 'Get Deals',
  key: 'get_deals',
  description: `Retrieve one or more deals from Pipedrive. Fetch a single deal by ID or list deals with optional filtering by pipeline, stage, status, user, or filter.
Returns deal properties including title, value, stage, linked contacts, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z
        .number()
        .optional()
        .describe('Specific deal ID to fetch. If provided, returns a single deal.'),
      pipelineId: z.number().optional().describe('Filter deals by pipeline ID'),
      stageId: z.number().optional().describe('Filter deals by stage ID'),
      status: z
        .enum(['open', 'won', 'lost', 'deleted', 'all_not_deleted'])
        .optional()
        .describe('Filter by deal status'),
      userId: z.number().optional().describe('Filter deals by owner user ID'),
      filterId: z.number().optional().describe('Filter ID for custom filtering'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)'),
      sort: z.string().optional().describe('Sort field and direction, e.g. "value DESC"')
    })
  )
  .output(
    z.object({
      deals: z.array(dealSchema).describe('List of deals'),
      totalCount: z.number().optional().describe('Total number of matching deals'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.dealId) {
      let result = await client.getDeal(ctx.input.dealId);
      let deal = result?.data;
      return {
        output: {
          deals: deal
            ? [
                {
                  dealId: deal.id,
                  title: deal.title,
                  value: deal.value,
                  currency: deal.currency,
                  status: deal.status,
                  stageId: deal.stage_id,
                  pipelineId: deal.pipeline_id,
                  personName: deal.person_id?.name ?? null,
                  organizationName: deal.org_id?.name ?? null,
                  ownerName: deal.owner_name,
                  addTime: deal.add_time,
                  updateTime: deal.update_time,
                  expectedCloseDate: deal.expected_close_date,
                  stageOrderNr: deal.stage_order_nr,
                  probability: deal.probability
                }
              ]
            : [],
          totalCount: deal ? 1 : 0
        },
        message: deal
          ? `Found deal **"${deal.title}"** (ID: ${deal.id}, status: ${deal.status}).`
          : 'Deal not found.'
      };
    }

    let result = await client.getDeals({
      start: ctx.input.start,
      limit: ctx.input.limit,
      status: ctx.input.status,
      stageId: ctx.input.stageId,
      pipelineId: ctx.input.pipelineId,
      userId: ctx.input.userId,
      filterId: ctx.input.filterId,
      sort: ctx.input.sort
    });

    let deals = (result?.data || []).map((deal: any) => ({
      dealId: deal.id,
      title: deal.title,
      value: deal.value,
      currency: deal.currency,
      status: deal.status,
      stageId: deal.stage_id,
      pipelineId: deal.pipeline_id,
      personName: deal.person_id?.name ?? deal.person_name ?? null,
      organizationName: deal.org_id?.name ?? deal.org_name ?? null,
      ownerName: deal.owner_name,
      addTime: deal.add_time,
      updateTime: deal.update_time,
      expectedCloseDate: deal.expected_close_date,
      stageOrderNr: deal.stage_order_nr,
      probability: deal.probability
    }));

    return {
      output: {
        deals,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${deals.length}** deal(s).`
    };
  });
