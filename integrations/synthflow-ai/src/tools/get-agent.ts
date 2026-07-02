import { SlateTool } from 'slates';
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
      agentId: z.string().describe('The model ID of the agent to retrieve')
    })
  )
  .output(
    z.object({
      agent: z.record(z.string(), z.any()).describe('Full agent configuration and details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAgent(ctx.input.agentId);
    let agent = result.response?.assistants || result.response || {};

    return {
      output: {
        agent
      },
      message: `Retrieved agent **${agent.name || ctx.input.agentId}**.`
    };
  })
  .build();
