import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

let getDayNumber = (value: string) => {
  let normalized = value.trim().toLowerCase();
  let day = weekdays.indexOf(normalized);
  if (day === -1 && /^[0-6]$/.test(normalized)) day = Number(normalized);
  if (day === -1) {
    throw createApiServiceError(
      'Schedule day must be a weekday name or a number from 0 (Sunday) to 6 (Saturday).'
    );
  }
  return day;
};

let getApiTime = (value: string) => {
  if (value === 'allday') return value;
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw createApiServiceError('Schedule times must use HH:MM, HH:MM:SS, or allday.');
  }
  return value.length === 5 ? `${value}:00` : value;
};

let mapSchedule = (days: any[]) =>
  days.map(day => ({
    day:
      typeof day.day === 'number'
        ? (weekdays[day.day] ?? String(day.label ?? day.day))
        : String(day.day ?? day.label),
    isAvailable: day.is_available === true || day.is_available === 1,
    times: day.times?.map((time: any) => ({ start: time.start, end: time.end }))
  }));

let timeWindowSchema = z.object({
  start: z.string().describe('Start time in HH:MM or HH:MM:SS format, or allday'),
  end: z.string().describe('End time in HH:MM or HH:MM:SS format, or allday')
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
    'Use weekday names and HH:MM or HH:MM:SS times in 24-hour notation, or allday.'
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
      let apiSchedule = ctx.input.schedule.map(day => {
        let dayNumber = getDayNumber(day.day);
        let weekday = weekdays[dayNumber]!;
        return {
          label: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`,
          day: dayNumber,
          is_available: day.isAvailable,
          times: day.times?.map(t => ({ start: getApiTime(t.start), end: getApiTime(t.end) }))
        };
      });

      let result = await client.updateAgentSchedule(ctx.input.agentId, apiSchedule);
      if (!Array.isArray(result) && !Array.isArray(result?.schedule)) {
        result = await client.getAgentSchedule(ctx.input.agentId);
      }
      let scheduleArray = Array.isArray(result) ? result : (result?.schedule ?? []);
      let schedule = mapSchedule(scheduleArray);

      return {
        output: { agentId: ctx.input.agentId, schedule },
        message: `Schedule for agent **${ctx.input.agentId}** updated successfully.`
      };
    }

    let result = await client.getAgentSchedule(ctx.input.agentId);
    let scheduleArray = Array.isArray(result) ? result : (result.schedule ?? []);

    let schedule = mapSchedule(scheduleArray);

    return {
      output: { agentId: ctx.input.agentId, schedule },
      message: `Retrieved schedule for agent **${ctx.input.agentId}** with ${schedule.length} day(s) configured.`
    };
  })
  .build();
