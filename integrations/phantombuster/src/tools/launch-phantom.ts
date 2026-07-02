import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let launchPhantom = SlateTool.create(spec, {
  name: 'Launch Phantom',
  key: 'launch_phantom',
  description: `Launch a Phantom immediately with optional custom arguments. The Phantom must already be set up in your PhantomBuster workspace. Returns a container ID to track the execution.`,
  instructions: [
    'The Phantom must be fully configured in your PhantomBuster workspace before launching via API.',
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
        containerId: result?.containerId ? String(result.containerId) : undefined,
        status: result?.status ?? 'launched'
      },
      message: `Phantom **${ctx.input.phantomId}** has been launched.${result?.containerId ? ` Container ID: ${result.containerId}` : ''}`
    };
  })
  .build();
