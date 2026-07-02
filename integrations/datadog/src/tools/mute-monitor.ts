import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let muteMonitor = SlateTool.create(spec, {
  name: 'Mute/Unmute Monitor',
  key: 'mute_monitor',
  description: `Mute or unmute a Datadog monitor. Muting suppresses notifications for the monitor. Optionally scope the mute to specific groups and set an end time.`,
  instructions: [
    'Set action to "mute" to suppress notifications, "unmute" to re-enable them.',
    'Use scope to mute specific groups, e.g. "host:myhost" or "env:staging".',
    'Use endTimestamp to auto-unmute at a specific Unix timestamp.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.number().describe('ID of the monitor to mute or unmute'),
      action: z.enum(['mute', 'unmute']).describe('Whether to mute or unmute the monitor'),
      scope: z.string().optional().describe('Scope to apply the mute to, e.g. "host:myhost"'),
      endTimestamp: z
        .number()
        .optional()
        .describe('Unix timestamp when the mute should automatically expire')
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('ID of the affected monitor'),
      name: z.string().describe('Monitor name'),
      overallState: z.string().optional().describe('Current monitor state')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let monitor: any;

    if (ctx.input.action === 'mute') {
      monitor = await client.muteMonitor(ctx.input.monitorId, {
        scope: ctx.input.scope,
        end: ctx.input.endTimestamp
      });
    } else {
      monitor = await client.unmuteMonitor(ctx.input.monitorId, {
        scope: ctx.input.scope
      });
    }

    return {
      output: {
        monitorId: monitor.id,
        name: monitor.name,
        overallState: monitor.overall_state
      },
      message:
        ctx.input.action === 'mute'
          ? `Muted monitor **${monitor.name}** (ID: ${monitor.id})`
          : `Unmuted monitor **${monitor.name}** (ID: ${monitor.id})`
    };
  })
  .build();
