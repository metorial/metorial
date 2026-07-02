import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let updateSource = SlateTool.create(spec, {
  name: 'Update Source',
  key: 'update_source',
  description: `Updates an existing data source's configuration. Can modify display name, connection properties, replication schedule, and pause/resume the source. The source type cannot be changed after creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to update'),
      displayName: z.string().optional().describe('New display name'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated connection properties'),
      paused: z
        .boolean()
        .optional()
        .describe('Set to true to pause replication, false to resume'),
      schedule: z
        .object({
          type: z.enum(['interval', 'cron']).optional().describe('Schedule type'),
          intervalInMinutes: z
            .number()
            .optional()
            .describe('Replication frequency in minutes (for interval type)'),
          cronExpression: z.string().optional().describe('Cron expression (for cron type)'),
          anchorTime: z.string().optional().describe('ISO 8601 anchor time for scheduling')
        })
        .optional()
        .describe('Replication schedule configuration')
    })
  )
  .output(
    z.object({
      sourceId: z.number().describe('ID of the updated source'),
      type: z.string().describe('Source type'),
      name: z.string().nullable().describe('Updated display name'),
      updatedAt: z.string().nullable().describe('ISO 8601 timestamp of the update'),
      reportCard: z.any().optional().describe('Updated configuration status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let body: Record<string, any> = {};

    if (ctx.input.displayName !== undefined) {
      body.display_name = ctx.input.displayName;
    }
    if (ctx.input.properties !== undefined) {
      body.properties = ctx.input.properties;
    }
    if (ctx.input.paused !== undefined) {
      body.paused_at = ctx.input.paused ? new Date().toISOString() : null;
    }
    if (ctx.input.schedule) {
      if (ctx.input.schedule.type === 'interval' && ctx.input.schedule.intervalInMinutes) {
        body.frequency_in_minutes = ctx.input.schedule.intervalInMinutes.toString();
      }
      if (ctx.input.schedule.type === 'cron' && ctx.input.schedule.cronExpression) {
        body.cron_expression = ctx.input.schedule.cronExpression;
      }
      if (ctx.input.schedule.anchorTime) {
        body.anchor_time = ctx.input.schedule.anchorTime;
      }
    }

    let source = await client.updateSource(ctx.input.sourceId, body);

    return {
      output: {
        sourceId: source.id,
        type: source.type,
        name: source.display_name || source.name || null,
        updatedAt: source.updated_at || null,
        reportCard: source.report_card
      },
      message: `Updated source **${source.display_name || source.name || source.id}**.`
    };
  })
  .build();
