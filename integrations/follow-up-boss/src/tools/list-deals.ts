import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List deals (transactions) in Follow Up Boss. Supports filtering by person, pipeline, stage, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Filter by contact ID'),
      pipelineId: z.number().optional().describe('Filter by pipeline ID'),
      stageId: z.number().optional().describe('Filter by pipeline stage ID'),
      sort: z.string().optional().describe('Sort field'),
      limit: z.number().optional().describe('Number of results (default 25, max 100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      deals: z.array(
        z.object({
          dealId: z.number(),
          personId: z.number().optional(),
          name: z.string().optional(),
          pipelineId: z.number().optional(),
          stageId: z.number().optional(),
          dealType: z.string().optional(),
          price: z.number().optional(),
          closingDate: z.string().optional(),
          created: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.personId) params.personId = ctx.input.personId;
    if (ctx.input.pipelineId) params.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId) params.stageId = ctx.input.stageId;
    if (ctx.input.sort) params.sort = ctx.input.sort;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listDeals(params);
    let deals = result.deals || [];

    return {
      output: {
        deals: deals.map((d: any) => ({
          dealId: d.id,
          personId: d.personId,
          name: d.name,
          pipelineId: d.pipelineId,
          stageId: d.stageId,
          dealType: d.dealType,
          price: d.price,
          closingDate: d.closingDate,
          created: d.created
        })),
        total: result._metadata?.total
      },
      message: `Found **${deals.length}** deal(s)${result._metadata?.total ? ` of ${result._metadata.total} total` : ''}.`
    };
  })
  .build();
