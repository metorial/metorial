import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let getCitation = SlateTool.create(spec, {
  name: 'Get Citation',
  key: 'get_citation',
  description: `Retrieve detailed metadata for a specific citation referenced in an agent's response. Citations provide traceability back to the original source material.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent'),
      citationId: z.string().describe('Citation ID to retrieve')
    })
  )
  .output(
    z.object({
      citation: z
        .record(z.string(), z.unknown())
        .describe('Citation metadata including source URL, title, and content snippet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let citation = await client.getCitation(ctx.input.projectId, ctx.input.citationId);

    return {
      output: { citation },
      message: `Retrieved citation **${ctx.input.citationId}** for agent **${ctx.input.projectId}**.`
    };
  })
  .build();
