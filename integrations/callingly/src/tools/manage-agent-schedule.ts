import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timeWindowSchema = z.object({
  start: z.string().describe('Start time in HH:MM format (e.g., "09:00")'),
  end: z.string().describe('End time in HH:MM format (e.g., "17:00")')
});

let dayScheduleSchema = z.object({
  day: z.string().describe('Day of the week (e.g., "monday", "tuesday")'),
  isAvailable: z.boolean().describe('Whether the agent is available on this day'),
  times: z
    .array(timeWindowSchema)
    .optional()
    .describe('Time windows when the agent is available')
});

export let manageAgentSchedule = SlateTool.create(spec, {
  name: 'Manage Agent Schedule',
  key: 'manage_agent_schedule',
  description: `Get or update an agent's weekly availability schedule. Each day can be toggled available/unavailable and supports multiple time windows (e.g., morning and afternoon shifts).
- To **retrieve** the schedule, provide only the agentId.
- To **update** the schedule, provide the agentId and the schedule array.`,
  instructions: [
    'Each day supports multiple time windows to allow for split shifts.',
    'Time format is HH:MM in 24-hour notation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent'),
      schedule: z
        .array(dayScheduleSchema)
        .optional()
        .describe('Weekly schedule to set. Omit to retrieve current schedule.')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the agent'),
      schedule: z
        .array(
          z.object({
            day: z.string().describe('Day of the week'),
            isAvailable: z.boolean().describe('Whether available'),
            times: z
              .array(
                z.object({
                  start: z.string().describe('Start time'),
                  end: z.string().describe('End time')
                })
              )
              .optional()
              .describe('Time windows')
          })
        )
        .describe('Weekly availability schedule')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.schedule) {
      let apiSchedule = ctx.input.schedule.map(day => ({
        day: day.day,
        is_available: day.isAvailable,
        times: day.times?.map(t => ({ start: t.start, end: t.end }))
      }));

      let result = await client.updateAgentSchedule(ctx.input.agentId, apiSchedule);
      let scheduleArray = Array.isArray(result) ? result : (result.schedule ?? []);

      let schedule = scheduleArray.map((day: any) => ({
        day: day.day ?? day.label,
        isAvailable: day.is_available ?? false,
        times: day.times?.map((t: any) => ({ start: t.start, end: t.end }))
      }));

      return {
        output: { agentId: ctx.input.agentId, schedule },
        message: `Schedule for agent **${ctx.input.agentId}** updated successfully.`
      };
    }

    let result = await client.getAgentSchedule(ctx.input.agentId);
    let scheduleArray = Array.isArray(result) ? result : (result.schedule ?? []);

    let schedule = scheduleArray.map((day: any) => ({
      day: day.day ?? day.label,
      isAvailable: day.is_available ?? false,
      times: day.times?.map((t: any) => ({ start: t.start, end: t.end }))
    }));

    return {
      output: { agentId: ctx.input.agentId, schedule },
      message: `Retrieved schedule for agent **${ctx.input.agentId}** with ${schedule.length} day(s) configured.`
    };
  })
  .build();
