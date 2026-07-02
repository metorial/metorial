import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let cloneAgent = SlateTool.create(spec, {
  name: 'Clone Agent',
  key: 'clone_agent',
  description: `Create a duplicate of an existing AI agent, including its knowledge base and configuration. Useful for creating variations or backups of agents.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent to clone')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the newly cloned agent'),
      projectName: z.string().describe('Name of the cloned agent'),
      type: z.string().describe('Agent type'),
      createdAt: z.string().describe('Creation timestamp of the clone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let cloned = await client.cloneAgent(ctx.input.projectId);

    return {
      output: {
        projectId: cloned.projectId,
        projectName: cloned.projectName,
        type: cloned.type,
        createdAt: cloned.createdAt
      },
      message: `Cloned agent **${ctx.input.projectId}** as **${cloned.projectName}** (ID: ${cloned.projectId}).`
    };
  })
  .build();
