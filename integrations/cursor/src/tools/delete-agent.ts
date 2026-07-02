import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description: `Permanently delete a Cursor cloud agent. Conversation history will no longer be retrievable after deletion.`,
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
      agentId: z.string().describe('ID of the deleted agent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.deleteAgent(ctx.input.agentId);

    return {
      output: {
        agentId: result.id
      },
      message: `Agent **${result.id}** has been deleted.`
    };
  })
  .build();
