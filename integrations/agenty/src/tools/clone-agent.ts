import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cloneAgent = SlateTool.create(spec, {
  name: 'Clone Agent',
  key: 'clone_agent',
  description: `Create a copy of an existing agent with all its configuration, fields, and input URLs. Useful for duplicating agent setups to create variations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('The unique identifier of the agent to clone.')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('The ID of the newly cloned agent.'),
      name: z.string().describe('Name of the cloned agent.'),
      type: z.string().describe('Agent type.'),
      createdAt: z
        .string()
        .optional()
        .nullable()
        .describe('ISO 8601 creation timestamp of the clone.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let a = await client.cloneAgent(ctx.input.agentId);

    return {
      output: {
        agentId: a.agent_id,
        name: a.name,
        type: a.type,
        createdAt: a.created_at
      },
      message: `Cloned agent as **${a.name}** (ID: ${a.agent_id}).`
    };
  })
  .build();
