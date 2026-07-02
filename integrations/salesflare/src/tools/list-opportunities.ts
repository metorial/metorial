import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOpportunities = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description: `Search and list sales opportunities in Salesflare. Filter by stage, owner, account, value range, close date, pipeline, tags, and more. Default date filter is on close_date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Full-text search'),
      name: z.string().optional().describe('Filter by opportunity name'),
      stageId: z.number().optional().describe('Filter by stage ID'),
      stageName: z.string().optional().describe('Filter by stage name'),
      ownerId: z.number().optional().describe('Filter by owner user ID'),
      accountId: z.number().optional().describe('Filter by account ID'),
      assigneeId: z.number().optional().describe('Filter by assignee user ID'),
      pipelineId: z.number().optional().describe('Filter by pipeline ID'),
      minValue: z.number().optional().describe('Minimum opportunity value'),
      maxValue: z.number().optional().describe('Maximum opportunity value'),
      closeAfter: z.string().optional().describe('Filter by close date after (ISO 8601)'),
      closeBefore: z.string().optional().describe('Filter by close date before (ISO 8601)'),
      creationAfter: z
        .string()
        .optional()
        .describe('Filter by creation date after (ISO 8601)'),
      creationBefore: z
        .string()
        .optional()
        .describe('Filter by creation date before (ISO 8601)'),
      closed: z.boolean().optional().describe('Filter by closed status'),
      done: z.boolean().optional().describe('Filter by done status'),
      tagName: z.array(z.string()).optional().describe('Filter by tag name(s)'),
      hotness: z
        .number()
        .optional()
        .describe('Filter by hotness: 1=Room temp, 2=Hot, 3=On fire'),
      limit: z.number().optional().default(20).describe('Max results to return'),
      offset: z.number().optional().default(0).describe('Pagination offset'),
      orderBy: z.array(z.string()).optional().describe('Sort order, e.g. ["value desc"]')
    })
  )
  .output(
    z.object({
      opportunities: z
        .array(z.record(z.string(), z.any()))
        .describe('List of opportunity objects'),
      count: z.number().describe('Number of opportunities returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.stageId) params.stage = ctx.input.stageId;
    if (ctx.input.stageName) params['stage.name'] = ctx.input.stageName;
    if (ctx.input.ownerId) params.owner = ctx.input.ownerId;
    if (ctx.input.accountId) params.account = ctx.input.accountId;
    if (ctx.input.assigneeId) params.assignee = ctx.input.assigneeId;
    if (ctx.input.pipelineId) params.pipeline = ctx.input.pipelineId;
    if (ctx.input.minValue !== undefined) params.min_value = ctx.input.minValue;
    if (ctx.input.maxValue !== undefined) params.max_value = ctx.input.maxValue;
    if (ctx.input.closeAfter) params.close_after = ctx.input.closeAfter;
    if (ctx.input.closeBefore) params.close_before = ctx.input.closeBefore;
    if (ctx.input.creationAfter) params.creation_after = ctx.input.creationAfter;
    if (ctx.input.creationBefore) params.creation_before = ctx.input.creationBefore;
    if (ctx.input.closed !== undefined) params.closed = ctx.input.closed;
    if (ctx.input.done !== undefined) params.done = ctx.input.done;
    if (ctx.input.tagName) params['tag.name'] = ctx.input.tagName;
    if (ctx.input.hotness !== undefined) params.hotness = ctx.input.hotness;
    if (ctx.input.orderBy) params.order_by = ctx.input.orderBy;

    let opportunities = await client.listOpportunities(params);
    let list = Array.isArray(opportunities) ? opportunities : [];

    return {
      output: {
        opportunities: list,
        count: list.length
      },
      message: `Found **${list.length}** opportunity(ies).`
    };
  })
  .build();
