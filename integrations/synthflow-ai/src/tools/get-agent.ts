import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description: `Retrieve detailed information about a specific AI voice agent by its model ID. Returns the full agent configuration including prompts, voice settings, phone number, type, and recording preferences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Agent model ID from list_agents'),
      includeActions: z.boolean().optional().describe('Include action IDs and input variables')
    })
  )
  .output(
    z.object({
      agent: z.record(z.string(), z.any()).describe('Full agent configuration and details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getAgent(ctx.input.agentId, ctx.input.includeActions);
    let agents = result.response?.assistants;
    let agent = Array.isArray(agents)
      ? agents.find(item => item?.model_id === ctx.input.agentId)
      : agents;
    if (!agent || typeof agent !== 'object' || agent.model_id !== ctx.input.agentId)
      throw createApiServiceError('Synthflow did not return the requested agent.');

    return {
      output: {
        agent
      },
      message: `Retrieved agent **${agent.name || ctx.input.agentId}**.`
    };
  })
  .build();
