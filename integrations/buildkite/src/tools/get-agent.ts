import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';
export const getAgent = SlateTool.create(spec, {
  key: 'get_agent',
  name: 'Get Agent',
  description:
    'Inspect a known Buildkite agent, including stopped or disconnected agents. Call list_agents to discover connected agents. Requires read_agents.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...organizationInput,
      agentId: z.string().describe('Agent UUID from list_agents.')
    })
  )
  .output(
    z.object({
      agentId: z.string(),
      name: z.string(),
      connectionState: z.string(),
      hostname: z.string(),
      jobId: z.string().nullable(),
      queue: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const agent = await createClient(ctx).getAgent(ctx.input.agentId);
    return {
      output: {
        agentId: agent.id,
        name: agent.name,
        connectionState: agent.connection_state,
        hostname: agent.hostname,
        jobId: agent.job?.id ?? null,
        queue: agent.queue
      },
      message: `Agent **${agent.name}** is ${agent.connection_state}.`
    };
  });
