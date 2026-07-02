import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchDeals = SlateTool.create(spec, {
  name: 'Search Deals',
  key: 'search_deals',
  description: `Lists and filters deals across pipelines. Supports filtering by pipeline, stage, status, owner, and contact. Use for browsing deals or finding specific ones.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term for deal title'),
      pipelineId: z.string().optional().describe('Filter by pipeline ID'),
      stageId: z.string().optional().describe('Filter by stage ID'),
      status: z.number().optional().describe('Filter by status: 0=open, 1=won, 2=lost'),
      ownerId: z.string().optional().describe('Filter by deal owner user ID'),
      contactId: z.string().optional().describe('Filter by primary contact ID'),
      limit: z.number().optional().describe('Maximum number of deals to return (default 20)'),
      offset: z.number().optional().describe('Number of deals to skip for pagination')
    })
  )
  .output(
    z.object({
      deals: z.array(
        z.object({
          dealId: z.string(),
          title: z.string().optional(),
          value: z.string().optional(),
          currency: z.string().optional(),
          pipelineId: z.string().optional(),
          stageId: z.string().optional(),
          status: z.string().optional(),
          contactId: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.pipelineId) params['filters[group]'] = ctx.input.pipelineId;
    if (ctx.input.stageId) params['filters[stage]'] = ctx.input.stageId;
    if (ctx.input.status !== undefined) params['filters[status]'] = ctx.input.status;
    if (ctx.input.ownerId) params['filters[owner]'] = ctx.input.ownerId;
    if (ctx.input.contactId) params['filters[contact_id]'] = ctx.input.contactId;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listDeals(params);

    let deals = (result.deals || []).map((d: any) => ({
      dealId: d.id,
      title: d.title || undefined,
      value: d.value || undefined,
      currency: d.currency || undefined,
      pipelineId: d.group || undefined,
      stageId: d.stage || undefined,
      status: d.status !== undefined ? String(d.status) : undefined,
      contactId: d.contact || undefined,
      createdAt: d.cdate || undefined
    }));

    let totalCount = result.meta?.total ? Number(result.meta.total) : undefined;

    return {
      output: { deals, totalCount },
      message: `Found **${deals.length}** deals${totalCount !== undefined ? ` (out of ${totalCount} total)` : ''}.`
    };
  })
  .build();
