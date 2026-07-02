import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description: `Permanently delete a Bolna Voice AI agent and all associated data including batches, executions, and recordings.`,
  constraints: [
    'This action is irreversible. All agent data including batches and executions will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to delete')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the deleted agent'),
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteAgent(ctx.input.agentId);

    return {
      output: {
        agentId: ctx.input.agentId,
        status: result.state || 'deleted'
      },
      message: `Deleted agent \`${ctx.input.agentId}\` and all associated data.`
    };
  })
  .build();
