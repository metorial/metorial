import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let activityLogSchema = z.object({
  logId: z.string().optional().describe('Activity log identifier'),
  text: z.string().optional().describe('Plain text description of the activity'),
  html: z.string().optional().describe('HTML-formatted activity description'),
  createdAt: z.string().optional().describe('Activity timestamp'),
  environment: z.string().optional().describe('Environment associated with the activity'),
  project: z.string().optional().describe('Project associated with the activity'),
  config: z.any().optional().describe('Config associated with the activity'),
  user: z
    .object({
      email: z.string().optional(),
      name: z.string().optional(),
      profileImageUrl: z.string().optional()
    })
    .optional()
    .describe('User who performed the activity')
});

export let activityLogs = SlateTool.create(spec, {
  name: 'Activity Logs',
  key: 'activity_logs',
  description: `View workplace-wide activity logs to audit what happened in your Doppler workplace. Shows who performed what actions, when, and on which resources.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Action to perform'),
      logId: z.string().optional().describe('Activity log ID (required for "get")'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Items per page for listing')
    })
  )
  .output(
    z.object({
      logs: z.array(activityLogSchema).optional().describe('List of activity log entries'),
      log: activityLogSchema.optional().describe('Single activity log entry'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let mapLog = (l: any) => ({
      logId: l.id,
      text: l.text,
      html: l.html,
      createdAt: l.created_at,
      environment: l.environment,
      project: l.project,
      config: l.config,
      user: l.user
        ? {
            email: l.user.email,
            name: l.user.name,
            profileImageUrl: l.user.profile_image_url
          }
        : undefined
    });

    if (ctx.input.action === 'list') {
      let result = await client.listActivityLogs({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      return {
        output: {
          logs: result.logs.map(mapLog),
          page: result.page
        },
        message: `Found **${result.logs.length}** activity log entries (page ${result.page}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.logId) throw new Error('logId is required for "get" action');

      let log = await client.getActivityLog(ctx.input.logId);

      return {
        output: { log: mapLog(log) },
        message: `Retrieved activity log **${ctx.input.logId}**: ${log.text || 'No description'}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
