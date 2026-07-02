import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let listAgentsTool = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `Retrieve all agents (teammates) in your Landbot account. Agents handle human takeover conversations in the inbox.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      agents: z.array(z.record(z.string(), z.any())).describe('List of agent records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let result = await client.listAgents();
    let agents = result.results ?? result.agents ?? (Array.isArray(result) ? result : []);

    return {
      output: { agents },
      message: `Retrieved **${agents.length}** agents.`
    };
  });
