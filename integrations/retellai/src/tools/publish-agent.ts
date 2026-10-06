import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let publishAgent = SlateTool.create(spec, {
  name: 'Publish Voice Agent',
  key: 'publish_agent',
  description:
    'Publish an existing draft version in place so it can serve production calls. Publishing does not create another draft version.'
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('ID from list_agents'),
      version: z
        .number()
        .int()
        .min(0)
        .describe('Draft version from get_agent or create_agent'),
      versionDescription: z.string().optional(),
      versionTitle: z.string().optional()
    })
  )
  .output(
    z.object({ agentId: z.string(), version: z.number(), isPublished: z.boolean().optional() })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    await client.publishAgent(
      ctx.input.agentId,
      pickDefined({
        version: ctx.input.version,
        version_description: ctx.input.versionDescription,
        version_title: ctx.input.versionTitle
      })
    );
    let agent = await client.getAgent(ctx.input.agentId, ctx.input.version);
    return {
      output: {
        agentId: agent.agent_id,
        version: agent.version,
        isPublished: agent.is_published
      },
      message: `Published agent **${ctx.input.agentId}** version **${ctx.input.version}**.`
    };
  })
  .build();
