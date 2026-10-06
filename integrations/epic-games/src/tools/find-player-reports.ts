import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
import { pagingSchema } from '../lib/types';
import { identifier, time } from '../lib/validation';
import { spec } from '../spec';

let reportSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  sandboxId: z.string().optional().describe('Sandbox ID'),
  deploymentId: z.string().optional().describe('Deployment ID'),
  time: z.string().describe('When the report was submitted (ISO 8601)'),
  reportingPlayerId: z.string().describe('Product User ID of the reporter'),
  reportedPlayerId: z.string().describe('Product User ID of the reported player'),
  reasonId: z.number().describe('Report reason ID'),
  message: z.string().optional().describe('Report message from the reporter'),
  context: z.string().optional().describe('Additional context JSON')
});

export let findPlayerReports = SlateTool.create(spec, {
  name: 'Find Player Reports',
  key: 'find_player_reports',
  description: `Search and retrieve player reports for your deployment. Filter by reporting player, reported player, reason, or time range.
At least one of **reportingPlayerId** or **reportedPlayerId** must be provided. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportingPlayerId: z
        .string()
        .optional()
        .describe('Filter by the player who submitted the report'),
      reportedPlayerId: z
        .string()
        .optional()
        .describe('Filter by the player who was reported'),
      reasonId: z.number().int().optional().describe('Filter by report reason ID'),
      startTime: z.string().optional().describe('Start of time range (ISO 8601)'),
      endTime: z.string().optional().describe('End of time range (ISO 8601)'),
      order: z
        .enum(['time:desc', 'time:asc', 'reasonId:asc', 'reasonId:desc'])
        .default('time:desc')
        .describe('Sort order for results'),
      limit: z.number().min(1).max(50).default(50).describe('Maximum number of results'),
      offset: z.number().min(0).default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      reports: z.array(reportSchema).describe('Matching player reports'),
      paging: pagingSchema.optional().describe('Native offset, limit and total.'),
      total: z.number().optional().describe('Total number of matching reports')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.reportingPlayerId && !ctx.input.reportedPlayerId)
      throw createApiServiceError('Supply reportingPlayerId or reportedPlayerId.');
    if (ctx.input.reportingPlayerId)
      identifier(ctx.input.reportingPlayerId, 'Reporting player');
    if (ctx.input.reportedPlayerId) identifier(ctx.input.reportedPlayerId, 'Reported player');
    if (ctx.input.startTime) time(ctx.input.startTime, 'Start time');
    if (ctx.input.endTime) time(ctx.input.endTime, 'End time');
    if (
      ctx.input.startTime &&
      ctx.input.endTime &&
      Date.parse(ctx.input.startTime) > Date.parse(ctx.input.endTime)
    )
      throw createApiServiceError('startTime must not follow endTime.');
    const data = await gameClient(ctx).findPlayerReports({ ...ctx.input, pagination: true });
    return {
      output: { reports: data.elements, total: data.paging.total, paging: data.paging },
      message:
        'Returned one native player-report page; the report and moderation history is retained.'
    };
  })
  .build();
