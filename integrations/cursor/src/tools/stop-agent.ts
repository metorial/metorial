import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let stopAgent = SlateTool.create(spec, {
  name: 'Stop Agent',
  key: 'stop_agent',
  description: `Stop a running Cursor cloud agent. The agent will cease its current work. A stopped agent can be resumed by sending a follow-up instruction.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to stop')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the stopped agent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.stopAgent(ctx.input.agentId);

    return {
      output: {
        agentId: result.id
      },
      message: `Agent **${result.id}** has been stopped.`
    };
  })
  .build();
