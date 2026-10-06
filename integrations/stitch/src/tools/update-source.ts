import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { resolveRegion, StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let updateSource = SlateTool.create(spec, {
  name: 'Update Source',
  key: 'update_source',
  description: `Updates an existing data source's configuration. Can modify display name, connection properties, replication schedule, and pause/resume the source. The source type cannot be changed after creation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to update'),
      displayName: z.string().optional().describe('New display name'),
      properties: z
        .record(z.string(), z.unknown())
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
            .describe(
              'Replication frequency in minutes (for interval type). Documented values: 1 for databases, 30, 60, 360, 720, 1440.'
            ),
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
      reportCard: z.unknown().optional().describe('Updated configuration status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let body: Record<string, unknown> = {};

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
      let properties: Record<string, unknown> = { ...(ctx.input.properties ?? {}) };
      const schedule = ctx.input.schedule;
      if (
        schedule.type === 'interval' &&
        (!Number.isInteger(schedule.intervalInMinutes) ||
          (schedule.intervalInMinutes ?? 0) <= 0)
      )
        throw createApiServiceError(
          'An interval schedule requires a positive intervalInMinutes.'
        );
      if (schedule.type === 'cron' && !schedule.cronExpression?.trim())
        throw createApiServiceError('A cron schedule requires cronExpression.');
      if (
        schedule.anchorTime &&
        !z.iso.datetime({ offset: true }).safeParse(schedule.anchorTime).success
      )
        throw createApiServiceError('Provide a valid ISO timestamp for anchorTime.');
      if (ctx.input.schedule.type === 'interval' && ctx.input.schedule.intervalInMinutes) {
        properties.frequency_in_minutes = ctx.input.schedule.intervalInMinutes.toString();
        properties.cron_expression = null;
      }
      if (ctx.input.schedule.type === 'cron' && ctx.input.schedule.cronExpression) {
        properties.cron_expression = ctx.input.schedule.cronExpression;
      }
      if (ctx.input.schedule.anchorTime) {
        properties.anchor_time = ctx.input.schedule.anchorTime;
      }
      if (Object.keys(properties).length) body.properties = properties;
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
