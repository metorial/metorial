import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let controlMachine = SlateTool.create(spec, {
  name: 'Control Machine',
  key: 'control_machine',
  description: `Start, stop, restart, or suspend a Fly Machine. Also supports cordoning (disabling request routing) and uncordoning (re-enabling request routing).`,
  instructions: [
    'Use "start" to boot a stopped or suspended machine.',
    'Use "stop" to gracefully shut down a running machine.',
    'Use "restart" to stop and re-start a running machine.',
    'Use "suspend" to snapshot the machine state including memory.',
    'Use "cordon" to prevent Fly Proxy from routing requests to this machine.',
    'Use "uncordon" to resume request routing to this machine.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine'),
      action: z
        .enum(['start', 'stop', 'restart', 'suspend', 'cordon', 'uncordon'])
        .describe('Action to perform'),
      signal: z
        .string()
        .optional()
        .describe(
          'Stop/restart signal (e.g. "SIGTERM", "SIGINT"). Only used with stop and restart actions.'
        ),
      timeout: z
        .number()
        .optional()
        .describe(
          'Grace period in seconds before SIGKILL. Only used with stop and restart actions.'
        )
    })
  )
  .output(
    z.object({
      machineId: z.string().describe('Machine identifier'),
      action: z.string().describe('Action that was performed'),
      previousState: z
        .string()
        .optional()
        .describe('Machine state before the action (only returned for start)'),
      migrated: z
        .boolean()
        .optional()
        .describe('Whether the machine was migrated to a new host (only returned for start)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { appName, machineId, action, signal, timeout } = ctx.input;

    let previousState: string | undefined;
    let migrated: boolean | undefined;

    switch (action) {
      case 'start': {
        let result = await client.startMachine(appName, machineId);
        previousState = result.previousState;
        migrated = result.migrated;
        break;
      }
      case 'stop':
        await client.stopMachine(appName, machineId, { signal, timeout });
        break;
      case 'restart':
        await client.restartMachine(appName, machineId, { signal, timeout });
        break;
      case 'suspend':
        await client.suspendMachine(appName, machineId);
        break;
      case 'cordon':
        await client.cordonMachine(appName, machineId);
        break;
      case 'uncordon':
        await client.uncordonMachine(appName, machineId);
        break;
    }

    return {
      output: {
        machineId,
        action,
        previousState,
        migrated
      },
      message: `Successfully performed **${action}** on machine **${machineId}**.${previousState ? ` Previous state: **${previousState}**.` : ''}`
    };
  })
  .build();
