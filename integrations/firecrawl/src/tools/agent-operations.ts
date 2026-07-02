import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelAgentTool = SlateTool.create(spec, {
  name: 'Cancel Agent',
  key: 'cancel_agent',
  description: `Cancel a running Firecrawl agent job.`,
  instructions: ['Provide the agentId returned by Run Agent.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('The ID of the agent job to cancel')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Cancellation status'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelAgent(ctx.input.agentId);

    return {
      output: {
        status: result.status,
        success: result.success
      },
      message: `Cancelled agent job \`${ctx.input.agentId}\`.`
    };
  });
