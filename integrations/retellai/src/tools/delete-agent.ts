import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let deleteAgent = SlateTool.create(spec, {
  name: 'Delete Voice Agent',
  key: 'delete_agent',
  description: `Delete a voice agent and all of its versions. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('Unique ID of the agent to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    await client.deleteAgent(ctx.input.agentId);

    return {
      output: { success: true },
      message: `Deleted voice agent **${ctx.input.agentId}**.`
    };
  })
  .build();
