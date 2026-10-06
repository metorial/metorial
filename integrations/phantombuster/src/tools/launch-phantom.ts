import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, identifier, text } from '../lib/client';
import { spec } from '../spec';

export let launchPhantom = SlateTool.create(spec, {
  name: 'Launch Phantom',
  key: 'launch_phantom',
  description: `Add a Phantom to the launch queue with optional custom arguments. The Phantom must already be set up in your PhantomBuster workspace. Returns a container ID to track the asynchronous execution. Launches can use paid runtime and perform external actions configured in the Phantom.`,
  tags: { readOnly: false, destructive: true },
  instructions: [
    'The Phantom must be fully configured in your PhantomBuster workspace and have succeeded at least once from the dashboard before launching via API.',
    'Combined Phantoms (multi-step automations/Flows) cannot be launched using this tool.',
    'Pass arguments matching the Phantom\'s expected input fields. Use the "Get Phantom" tool to see the current argument configuration.'
  ]
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom to launch'),
      argument: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          "JSON arguments to pass to the Phantom. Must match the Phantom's expected input fields."
        )
    })
  )
  .output(
    z.object({
      containerId: z
        .string()
        .optional()
        .describe('ID of the container created for this execution'),
      status: z.string().optional().describe('Status of the launch request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.launchAgent(ctx.input.phantomId, ctx.input.argument);

    return {
      output: {
        containerId: identifier(result.containerId, 'Returned container ID'),
        status: text(result.status)
      },
      message: `Phantom **${ctx.input.phantomId}** was accepted into the launch queue.${result?.containerId ? ` Container ID: ${result.containerId}` : ''}`
    };
  })
  .build();
