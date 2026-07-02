import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description: `Permanently delete an AI agent and all its associated data including conversations, sources, and documents. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the agent was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    await client.deleteAgent(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted agent **${ctx.input.projectId}**.`
    };
  })
  .build();
