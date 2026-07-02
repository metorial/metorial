import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let listIdeas = SlateTool.create(spec, {
  name: 'List Ideas',
  key: 'list_ideas',
  description: `Retrieve all ideas (sticky notes) from a specific Storm. Returns each idea's content, type, color, and position.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm to list ideas from')
    })
  )
  .output(
    z.object({
      ideas: z
        .array(
          z.object({
            ideaId: z.number().describe('Unique idea ID'),
            type: z
              .string()
              .optional()
              .describe('Idea type (text, indexcard, image, video, document, whiteboard)'),
            color: z.string().optional().describe('Idea color'),
            text: z.string().optional().describe('Text content of the idea'),
            x: z.number().optional().describe('X position'),
            y: z.number().optional().describe('Y position'),
            z: z.number().optional().describe('Z position (layer)'),
            lock: z.number().optional().describe('Lock status')
          })
        )
        .describe('List of ideas in the Storm')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let ideas = await client.listIdeas(ctx.input.stormId);
    let result = Array.isArray(ideas) ? ideas : [];

    return {
      output: {
        ideas: result.map((idea: any) => ({
          ideaId: idea.id,
          type: idea.type,
          color: idea.color,
          text: idea.data?.text || idea.text,
          x: idea.x,
          y: idea.y,
          z: idea.z,
          lock: idea.lock
        }))
      },
      message: `Found **${result.length}** idea(s) in Storm ${ctx.input.stormId}.`
    };
  })
  .build();
