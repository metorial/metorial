import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

let monitorSchema = z.object({
  monitorId: z.string().describe('Monitor identifier'),
  behaviorType: z.string().describe('Monitor behavior: search or refresh'),
  cronSchedule: z.string().describe('Cron expression for the schedule'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let createMonitorTool = SlateTool.create(spec, {
  name: 'Create Monitor',
  key: 'create_monitor',
  description: `Create a monitor on a Webset to automatically keep it updated on a schedule.
**Search** behavior runs new searches to find fresh content with automatic deduplication. **Refresh** behavior updates existing items by re-running enrichments.
Schedules use cron expressions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to monitor'),
      behaviorType: z
        .enum(['search', 'refresh'])
        .describe('search: find new content, refresh: update existing items'),
      cronSchedule: z
        .string()
        .describe(
          'Cron expression for the schedule (e.g., "0 9 * * 1" for every Monday at 9am)'
        )
    })
  )
  .output(monitorSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.createMonitor(ctx.input.websetId, {
      behavior: { type: ctx.input.behaviorType },
      cadence: { cron: ctx.input.cronSchedule }
    });

    return {
      output: {
        monitorId: result.id,
        behaviorType: result.behavior?.type ?? ctx.input.behaviorType,
        cronSchedule: result.cadence?.cron ?? ctx.input.cronSchedule,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created **${ctx.input.behaviorType}** monitor **${result.id}** on Webset **${ctx.input.websetId}** with schedule: \`${ctx.input.cronSchedule}\`.`
    };
  })
  .build();

export let deleteMonitorTool = SlateTool.create(spec, {
  name: 'Delete Monitor',
  key: 'delete_monitor',
  description: `Delete a monitor from a Webset, stopping its scheduled operations.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID'),
      monitorId: z.string().describe('The monitor ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    await client.deleteMonitor(ctx.input.websetId, ctx.input.monitorId);

    return {
      output: { deleted: true },
      message: `Deleted monitor **${ctx.input.monitorId}** from Webset **${ctx.input.websetId}**.`
    };
  })
  .build();
