import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let insightOutput = z.object({
  insightId: z.string().describe('Insight ID'),
  shortId: z.string().optional().describe('Short URL-friendly ID'),
  name: z.string().optional().describe('Insight name'),
  description: z.string().optional().describe('Insight description'),
  favorited: z.boolean().optional().describe('Whether the insight is favorited'),
  filters: z.record(z.string(), z.any()).optional().describe('Insight filter configuration'),
  query: z
    .record(z.string(), z.any())
    .optional()
    .describe('HogQL query configuration if applicable'),
  lastRefresh: z.string().optional().describe('Last time results were refreshed'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listInsightsTool = SlateTool.create(spec, {
  name: 'List Insights',
  key: 'list_insights',
  description: `List analytics insights (trends, funnels, retention, paths, stickiness, lifecycle).
Supports searching by name and filtering to saved insights only.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by insight name'),
      savedOnly: z.boolean().optional().describe('Only return saved insights'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      insights: z.array(insightOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listInsights({
      search: ctx.input.search,
      savedOnly: ctx.input.savedOnly,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let insights = (data.results || []).map((i: any) => ({
      insightId: String(i.id),
      shortId: i.short_id,
      name: i.name,
      description: i.description,
      favorited: i.favorited,
      filters: i.filters,
      query: i.query,
      lastRefresh: i.last_refresh,
      createdAt: i.created_at
    }));

    return {
      output: { insights, hasMore: !!data.next },
      message: `Found **${insights.length}** insight(s).`
    };
  })
  .build();

export let getInsightTool = SlateTool.create(spec, {
  name: 'Get Insight',
  key: 'get_insight',
  description: `Retrieve detailed information and results for a specific insight by its ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      insightId: z.string().describe('Insight ID')
    })
  )
  .output(insightOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let i = await client.getInsight(ctx.input.insightId);

    return {
      output: {
        insightId: String(i.id),
        shortId: i.short_id,
        name: i.name,
        description: i.description,
        favorited: i.favorited,
        filters: i.filters,
        query: i.query,
        lastRefresh: i.last_refresh,
        createdAt: i.created_at
      },
      message: `Retrieved insight **${i.name || i.id}**.`
    };
  })
  .build();
