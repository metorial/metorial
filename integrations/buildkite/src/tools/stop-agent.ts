import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopAgent = SlateTool.create(spec, {
  name: 'Stop Agent',
  key: 'stop_agent',
  description: `Stop a connected Buildkite agent. By default, the agent finishes its current job before stopping. Use force mode to stop immediately.`,
  constraints: ['Force-stopping an agent will interrupt any running job.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('UUID of the agent to stop'),
      force: z
        .boolean()
        .optional()
        .describe('Force stop the agent immediately, interrupting any running job')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether the stop command was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    await client.stopAgent(ctx.input.agentId, ctx.input.force);

    return {
      output: { stopped: true },
      message: `Sent stop command to agent \`${ctx.input.agentId}\`${ctx.input.force ? ' (force)' : ''}.`
    };
  });
