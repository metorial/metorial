import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `Retrieves deals from Spoki. Supports filtering by pipeline and stage for focused pipeline views.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      pipelineId: z.string().optional().describe('Filter by pipeline ID'),
      stageId: z.string().optional().describe('Filter by stage ID')
    })
  )
  .output(
    z.object({
      deals: z
        .array(
          z.object({
            dealId: z.string().optional().describe('Deal ID'),
            name: z.string().optional().describe('Deal name'),
            value: z.number().optional().describe('Deal value'),
            stageId: z.string().optional().describe('Current stage ID'),
            ownerId: z.string().optional().describe('Owner user ID')
          })
        )
        .describe('List of deals'),
      totalCount: z.number().optional().describe('Total number of deals'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Listing deals');
    let result = await client.listDeals({
      page: ctx.input.page,
      pipelineId: ctx.input.pipelineId,
      stageId: ctx.input.stageId
    });

    let items = Array.isArray(result) ? result : result?.results || result?.data || [];
    let deals = items.map((d: any) => ({
      dealId: d.id ? String(d.id) : undefined,
      name: d.name,
      value: d.value,
      stageId: d.stage_id ? String(d.stage_id) : d.stage ? String(d.stage) : undefined,
      ownerId: d.owner_id ? String(d.owner_id) : d.owner ? String(d.owner) : undefined
    }));

    return {
      output: {
        deals,
        totalCount: result?.count ?? result?.total ?? deals.length,
        raw: result
      },
      message: `Found **${deals.length}** deals`
    };
  })
  .build();
