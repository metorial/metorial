import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let scheduleSchema = z.object({
  cron: z.string().describe('Cron expression (UTC)'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  modifiedOn: z.string().optional().describe('ISO 8601 last modified timestamp')
});

export let getSchedules = SlateTool.create(spec, {
  name: 'Get Cron Triggers',
  key: 'get_schedules',
  description: `Retrieve all cron trigger schedules configured for a Worker. Cron Triggers run the Worker's scheduled() handler on a recurring schedule (UTC).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script')
    })
  )
  .output(
    z.object({
      schedules: z.array(scheduleSchema).describe('List of cron trigger schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getSchedules(ctx.input.scriptName);
    let schedules = result?.schedules || result || [];

    let mapped = schedules.map((s: any) => ({
      cron: s.cron,
      createdOn: s.created_on,
      modifiedOn: s.modified_on
    }));

    return {
      output: { schedules: mapped },
      message: `Found **${mapped.length}** cron trigger(s) for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let updateSchedules = SlateTool.create(spec, {
  name: 'Update Cron Triggers',
  key: 'update_schedules',
  description: `Replace all cron trigger schedules for a Worker. This completely replaces the existing schedules — provide all desired cron expressions. Schedules execute on UTC time.`,
  instructions: [
    'Cron expressions use standard 5-field format: minute hour day-of-month month day-of-week.',
    'All times are in UTC.',
    'This replaces all existing schedules — include any existing ones you want to keep.'
  ]
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      schedules: z
        .array(
          z.object({
            cron: z
              .string()
              .describe('Cron expression in UTC (e.g. "*/30 * * * *" for every 30 minutes)')
          })
        )
        .describe('Complete list of cron schedules to set')
    })
  )
  .output(
    z.object({
      schedules: z.array(scheduleSchema).describe('Updated list of cron trigger schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.updateSchedules(ctx.input.scriptName, ctx.input.schedules);
    let schedules = result?.schedules || result || [];

    let mapped = schedules.map((s: any) => ({
      cron: s.cron,
      createdOn: s.created_on,
      modifiedOn: s.modified_on
    }));

    return {
      output: { schedules: mapped },
      message: `Set **${mapped.length}** cron trigger(s) for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
