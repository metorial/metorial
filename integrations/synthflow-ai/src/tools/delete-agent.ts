import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description: `Permanently delete an AI voice agent from your Synthflow account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Agent model ID from list_agents')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.deleteAgent(ctx.input.agentId);

    return {
      output: {
        message: result.response?.answer || 'Agent deleted successfully'
      },
      message: `Deleted agent \`${ctx.input.agentId}\`.`
    };
  })
  .build();
