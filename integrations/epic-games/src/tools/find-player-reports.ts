import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
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
      total: z.number().optional().describe('Total number of matching reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosGameServicesClient({
      token: ctx.auth.token,
      deploymentId: ctx.config.deploymentId
    });

    let data = await client.findPlayerReports({
      reportingPlayerId: ctx.input.reportingPlayerId,
      reportedPlayerId: ctx.input.reportedPlayerId,
      reasonId: ctx.input.reasonId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      pagination: true
    });

    let reports = data.elements ?? [];
    let total = data.paging?.total;

    return {
      output: { reports, total },
      message: `Found **${reports.length}** player report(s)${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
