import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDowntime = SlateTool.create(spec, {
  name: 'Get Downtime',
  key: 'get_downtime',
  description: `Get details for a Datadog downtime by ID, including scope, status, monitor target, schedule, and notification settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      downtimeId: z.string().describe('Downtime ID to retrieve')
    })
  )
  .output(
    z.object({
      downtimeId: z.string().describe('Downtime ID'),
      status: z.string().optional().describe('Downtime status'),
      scope: z.string().optional().describe('Downtime scope'),
      message: z.string().optional().describe('Downtime message'),
      monitorId: z.number().optional().describe('Target monitor ID'),
      monitorTags: z.array(z.string()).optional().describe('Target monitor tags'),
      schedule: z.any().optional().describe('Raw downtime schedule'),
      notifyEndStates: z.array(z.string()).optional().describe('States that notify at end'),
      notifyEndTypes: z.array(z.string()).optional().describe('End notification types')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.getDowntime(ctx.input.downtimeId);
    let downtime = result.data || result;

    return {
      output: {
        downtimeId: downtime.id || ctx.input.downtimeId,
        status: downtime.attributes?.status,
        scope: downtime.attributes?.scope,
        message: downtime.attributes?.message,
        monitorId: downtime.attributes?.monitor_identifier?.monitor_id,
        monitorTags: downtime.attributes?.monitor_identifier?.monitor_tags,
        schedule: downtime.attributes?.schedule,
        notifyEndStates: downtime.attributes?.notify_end_states,
        notifyEndTypes: downtime.attributes?.notify_end_types
      },
      message: `Retrieved downtime **${downtime.id || ctx.input.downtimeId}**`
    };
  })
  .build();
