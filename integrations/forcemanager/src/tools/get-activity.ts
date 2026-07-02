import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `Retrieve one or more sales activity records from ForceManager.
Fetch by ID or list/search activities with filtering by account, contact, sales rep, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.number().optional().describe('Specific activity ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      accountId: z.number().optional().describe('Filter by account ID'),
      contactId: z.number().optional().describe('Filter by contact ID'),
      salesRepId: z.number().optional().describe('Filter by sales rep ID'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      activities: z.array(z.any()).describe('List of matching activity records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.activityId) {
      let activity = await client.getActivity(ctx.input.activityId);
      return {
        output: { activities: [activity], totalCount: 1, nextPage: null },
        message: `Retrieved activity ID **${ctx.input.activityId}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.accountId) params.accountId = ctx.input.accountId;
    if (ctx.input.contactId) params.contactId = ctx.input.contactId;
    if (ctx.input.salesRepId) params.salesRepId = ctx.input.salesRepId;

    let result = await client.listActivities(params, ctx.input.page);

    return {
      output: {
        activities: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** activity/activities${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
