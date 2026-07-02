import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cloneGraph = SlateTool.create(spec, {
  name: 'Clone Graph',
  key: 'clone_graph',
  description: `Clone a user or group knowledge graph into a new standalone graph. Useful for creating copies of a user's knowledge for testing, migration, or sharing purposes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUserId: z
        .string()
        .optional()
        .describe('User ID of the source graph to clone (provide this or sourceGraphId)'),
      sourceGraphId: z
        .string()
        .optional()
        .describe(
          'Graph ID of the source standalone graph to clone (provide this or sourceUserId)'
        ),
      targetGraphId: z.string().describe('ID for the new cloned graph')
    })
  )
  .output(
    z.object({
      cloned: z.boolean().describe('Whether the graph was successfully cloned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.cloneGraph({
      sourceUserId: ctx.input.sourceUserId,
      sourceGraphId: ctx.input.sourceGraphId,
      targetGraphId: ctx.input.targetGraphId
    });
    let source = ctx.input.sourceUserId
      ? `user **${ctx.input.sourceUserId}**`
      : `graph **${ctx.input.sourceGraphId}**`;
    return {
      output: { cloned: true },
      message: `Cloned graph from ${source} to **${ctx.input.targetGraphId}**.`
    };
  })
  .build();
