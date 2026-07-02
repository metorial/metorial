import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let configLogSchema = z.object({
  logId: z.string().optional().describe('Log entry identifier'),
  text: z.string().optional().describe('Plain text description of the change'),
  html: z.string().optional().describe('HTML-formatted description'),
  rollback: z.boolean().optional().describe('Whether this log entry was a rollback'),
  createdAt: z.string().optional().describe('Timestamp of the change'),
  config: z.string().optional().describe('Config name'),
  environment: z.string().optional().describe('Environment name'),
  project: z.string().optional().describe('Project name'),
  user: z
    .object({
      email: z.string().optional(),
      name: z.string().optional(),
      profileImageUrl: z.string().optional()
    })
    .optional()
    .describe('User who made the change'),
  diff: z
    .array(
      z.object({
        name: z.string().optional().describe('Secret name that changed'),
        added: z.string().optional().describe('Value added'),
        removed: z.string().optional().describe('Value removed')
      })
    )
    .optional()
    .describe('Detailed diff of changes')
});

export let configLogs = SlateTool.create(spec, {
  name: 'Config Logs & Rollback',
  key: 'config_logs',
  description: `View the change history of a config's secrets and optionally roll back to a previous state. Each log entry shows what was modified, when, and by whom. Rollback reverts the config to the state before a specific change.`,
  instructions: [
    'Use action "list" to see the change history for a config.',
    'Use action "get" with a logId to see detailed diff for a specific change.',
    'Use action "rollback" with a logId to revert the config to before that change was applied.'
  ],
  constraints: [
    'Rolling back is a destructive operation that will overwrite current secret values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug'),
      config: z.string().describe('Config name'),
      action: z.enum(['list', 'get', 'rollback']).describe('Action to perform'),
      logId: z.string().optional().describe('Log entry ID (required for get and rollback)'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Items per page for listing')
    })
  )
  .output(
    z.object({
      logs: z.array(configLogSchema).optional().describe('List of config log entries'),
      log: configLogSchema.optional().describe('Single config log entry with diff'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let mapLog = (l: any) => ({
      logId: l.id,
      text: l.text,
      html: l.html,
      rollback: l.rollback,
      createdAt: l.created_at,
      config: l.config,
      environment: l.environment,
      project: l.project,
      user: l.user
        ? {
            email: l.user.email,
            name: l.user.name,
            profileImageUrl: l.user.profile_image_url
          }
        : undefined,
      diff: l.diff?.map((d: any) => ({
        name: d.name,
        added: d.added,
        removed: d.removed
      }))
    });

    if (ctx.input.action === 'list') {
      let result = await client.listConfigLogs(ctx.input.project, ctx.input.config, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      return {
        output: {
          logs: result.logs.map(mapLog),
          page: result.page
        },
        message: `Found **${result.logs.length}** config log entries for **${ctx.input.project}/${ctx.input.config}** (page ${result.page}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.logId) throw new Error('logId is required for "get" action');

      let log = await client.getConfigLog(
        ctx.input.project,
        ctx.input.config,
        ctx.input.logId
      );

      return {
        output: { log: mapLog(log) },
        message: `Retrieved config log **${ctx.input.logId}** for **${ctx.input.project}/${ctx.input.config}**: ${log.text || 'No description'}.`
      };
    }

    if (ctx.input.action === 'rollback') {
      if (!ctx.input.logId) throw new Error('logId is required for "rollback" action');

      let log = await client.rollbackConfigLog(
        ctx.input.project,
        ctx.input.config,
        ctx.input.logId
      );

      return {
        output: { log: mapLog(log) },
        message: `Rolled back config **${ctx.input.project}/${ctx.input.config}** to before log entry **${ctx.input.logId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
