import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActivities = SlateTool.create(spec, {
  name: 'List Proposal Activities',
  key: 'list_activities',
  description: `Retrieve the activity log for proposals. Activities include client views, PDF downloads, sends, status changes, acceptances, rejections, email bounces, and email opens. Filter by proposal or client.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.number().optional().describe('Filter activities by proposal ID'),
      clientId: z.number().optional().describe('Filter activities by client ID'),
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Number of activities per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          activityId: z.string(),
          activityType: z.string(),
          ipAddress: z.string().nullable(),
          additionalFields: z.record(z.string(), z.any()).nullable(),
          proposalId: z.number().nullable(),
          clientId: z.number().nullable()
        })
      ),
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listActivities(ctx.input);

    return {
      output: {
        activities: result.items,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** activities (page ${result.pagination.currentPage} of ${result.pagination.totalPages}).`
    };
  })
  .build();
