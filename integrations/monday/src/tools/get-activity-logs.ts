import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let getActivityLogsTool = SlateTool.create(spec, {
  name: 'Get Activity Logs',
  key: 'get_activity_logs',
  description: `Retrieve activity log entries for one or more boards. Activity logs capture a history of changes and actions performed on the board, including item creation, column updates, status changes, etc.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      boardIds: z.array(z.string()).describe('Board IDs to fetch activity logs from'),
      limit: z.number().optional().describe('Maximum number of log entries to return'),
      page: z.number().optional().describe('Page number for pagination'),
      from: z.string().optional().describe('Start date filter (ISO 8601 format)'),
      to: z.string().optional().describe('End date filter (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.string().describe('Activity log entry ID'),
            event: z.string().describe('Event type'),
            data: z.string().nullable().describe('Event data as JSON string'),
            entity: z.string().nullable().describe('Entity type'),
            accountId: z.string().nullable().describe('Account ID'),
            createdAt: z.string().describe('Activity timestamp'),
            userId: z.string().nullable().describe('User who performed the action')
          })
        )
        .describe('Activity log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let logs = await client.getActivityLogs(ctx.input.boardIds, {
      limit: ctx.input.limit,
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let mapped = logs.map((l: any) => ({
      activityId: String(l.id),
      event: l.event,
      data: l.data || null,
      entity: l.entity || null,
      accountId: l.account_id ? String(l.account_id) : null,
      createdAt: l.created_at,
      userId: l.user_id ? String(l.user_id) : null
    }));

    return {
      output: { activities: mapped },
      message: `Retrieved **${mapped.length}** activity log entries.`
    };
  })
  .build();
