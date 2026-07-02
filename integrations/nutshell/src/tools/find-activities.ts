import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let findActivities = SlateTool.create(spec, {
  name: 'Find Activities',
  key: 'find_activities',
  description: `Search and list activities in Nutshell CRM. Activities represent logged interactions such as calls, meetings, and emails.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter criteria for activities'),
      orderBy: z.string().optional().describe('Field to sort by'),
      orderDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      stubResponses: z
        .boolean()
        .optional()
        .describe('Return lightweight stub responses for faster performance')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.number().describe('ID of the activity'),
            name: z.string().describe('Activity name/subject'),
            status: z.any().optional().describe('Activity status'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of activities matching the criteria'),
      count: z.number().describe('Number of activities returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findActivities({
      query: ctx.input.query,
      orderBy: ctx.input.orderBy,
      orderDirection: ctx.input.orderDirection,
      limit: ctx.input.limit,
      page: ctx.input.page,
      stubResponses: ctx.input.stubResponses
    });

    let activities = results.map((a: any) => ({
      activityId: a.id,
      name: a.name,
      status: a.status,
      entityType: a.entityType
    }));

    return {
      output: {
        activities,
        count: activities.length
      },
      message: `Found **${activities.length}** activity(ies).`
    };
  })
  .build();
