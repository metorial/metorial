import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `Create, view, or delete a schedule for an agent. Schedules use CRON expressions to automatically start jobs at specified intervals (e.g. every 5 minutes, hourly, daily).`,
  instructions: [
    'CRON format: "seconds minutes hours dayOfMonth month dayOfWeek year". Example: "0 0 9 ? * MON-FRI *" runs at 9 AM on weekdays.',
    'Use action "create" to set a schedule, "get" to view the current schedule, or "delete" to remove it.'
  ]
})
  .input(
    z.object({
      agentId: z.string().describe('The agent ID to manage the schedule for.'),
      action: z.enum(['create', 'get', 'delete']).describe('The schedule action to perform.'),
      cronExpression: z
        .string()
        .optional()
        .describe('CRON expression for scheduling. Required when action is "create".'),
      enabled: z
        .boolean()
        .optional()
        .describe(
          'Whether the schedule is enabled. Defaults to true. Used when action is "create".'
        )
    })
  )
  .output(
    z.object({
      statusCode: z.number().optional().describe('HTTP status code.'),
      message: z.string().optional().describe('Status message.'),
      schedule: z
        .any()
        .optional()
        .nullable()
        .describe('Schedule details when using "get" action.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      let result = await client.getSchedule(ctx.input.agentId);
      return {
        output: {
          schedule: result
        },
        message: `Retrieved schedule for agent **${ctx.input.agentId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let result = await client.deleteSchedule(ctx.input.agentId);
      return {
        output: {
          statusCode: result.status_code || 200,
          message: result.message || 'Schedule deleted successfully.'
        },
        message: `Deleted schedule for agent **${ctx.input.agentId}**.`
      };
    }

    // create
    let result = await client.createSchedule(ctx.input.agentId, {
      type: 'cron',
      expression: ctx.input.cronExpression || '',
      is_enabled: ctx.input.enabled !== false
    });

    return {
      output: {
        statusCode: result.status_code || 200,
        message: result.message || 'Scheduled successfully.'
      },
      message: `Created schedule for agent **${ctx.input.agentId}** with CRON: \`${ctx.input.cronExpression}\`.`
    };
  })
  .build();
