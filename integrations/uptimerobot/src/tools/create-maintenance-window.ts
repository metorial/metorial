import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMaintenanceWindow = SlateTool.create(spec, {
  name: 'Create Maintenance Window',
  key: 'create_maintenance_window',
  description: `Create a maintenance window to suppress monitoring alerts during scheduled downtime. Supports one-time, daily, weekly, and monthly recurrence patterns.`,
  instructions: [
    'For **once** type: provide `startTime` as a Unix timestamp.',
    'For **daily/weekly/monthly** types: provide `startTime` in "HH:mm" format.',
    'For **weekly**: provide `days` as day-of-week numbers (1=Monday through 7=Sunday).',
    'For **monthly**: provide `days` as day-of-month numbers (1-28).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      friendlyName: z.string().describe('Display name for the maintenance window'),
      type: z.enum(['once', 'daily', 'weekly', 'monthly']).describe('Recurrence type'),
      startTime: z
        .string()
        .describe('Start time: Unix timestamp for "once", "HH:mm" format for recurring types'),
      duration: z.number().describe('Duration in minutes'),
      days: z
        .array(z.number())
        .optional()
        .describe('Day numbers for weekly (1-7) or monthly (1-28) recurrence')
    })
  )
  .output(
    z.object({
      windowId: z.number().describe('ID of the newly created maintenance window'),
      status: z.number().describe('Initial status of the window')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let typeMap: Record<string, number> = {
      once: 1,
      daily: 2,
      weekly: 3,
      monthly: 4
    };

    let value = '';
    if (ctx.input.days && ctx.input.days.length > 0) {
      value = ctx.input.days.join('-');
    }

    let result = await client.newMWindow({
      friendlyName: ctx.input.friendlyName,
      type: typeMap[ctx.input.type]!,
      startTime: ctx.input.startTime,
      duration: ctx.input.duration,
      value
    });

    return {
      output: {
        windowId: result.id,
        status: result.status
      },
      message: `Created **${ctx.input.type}** maintenance window "${ctx.input.friendlyName}" (ID: ${result.id}) for ${ctx.input.duration} minutes.`
    };
  })
  .build();
