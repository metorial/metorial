import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let getIdea = SlateTool.create(spec, {
  name: 'Get Idea',
  key: 'get_idea',
  description: `Retrieve detailed data and metadata for a specific idea in a Storm, including its content, type, position, and tag data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm containing the idea'),
      ideaId: z.string().describe('ID of the idea to retrieve')
    })
  )
  .output(
    z.object({
      ideaId: z.number().describe('Unique idea ID'),
      type: z.string().optional().describe('Idea type'),
      color: z.string().optional().describe('Idea color'),
      text: z.string().optional().describe('Text content'),
      x: z.number().optional().describe('X position'),
      y: z.number().optional().describe('Y position'),
      z: z.number().optional().describe('Z position (layer)'),
      lock: z.number().optional().describe('Lock status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let idea = await client.getIdea(ctx.input.stormId, ctx.input.ideaId);

    return {
      output: {
        ideaId: idea.id,
        type: idea.type,
        color: idea.color,
        text: idea.data?.text || idea.text,
        x: idea.x,
        y: idea.y,
        z: idea.z,
        lock: idea.lock
      },
      message: `Retrieved idea **${idea.id}** from Storm ${ctx.input.stormId}.`
    };
  })
  .build();
