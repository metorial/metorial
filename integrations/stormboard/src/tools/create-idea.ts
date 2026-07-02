import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let createIdea = SlateTool.create(spec, {
  name: 'Create Idea',
  key: 'create_idea',
  description: `Create a new idea (sticky note) in a Storm. Specify the content, type (text, indexcard, image, video, document, whiteboard), and color.`,
  instructions: [
    'Available types: text, indexcard, image, video, document, whiteboard',
    'Available colors: yellow, pink, green, blue, purple, grey, red, silver, orange'
  ]
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm to add the idea to'),
      type: z
        .enum(['text', 'indexcard', 'image', 'video', 'document', 'whiteboard'])
        .describe('Type of idea to create'),
      content: z.string().describe('Content/text for the idea'),
      color: z
        .enum(['yellow', 'pink', 'green', 'blue', 'purple', 'grey', 'red', 'silver', 'orange'])
        .describe('Color of the idea')
    })
  )
  .output(
    z.object({
      ideaId: z.number().describe('ID of the created idea'),
      stormId: z.number().optional().describe('ID of the parent Storm'),
      stormTitle: z.string().optional().describe('Title of the parent Storm'),
      type: z.string().optional().describe('Type of the created idea'),
      color: z.string().optional().describe('Color of the created idea'),
      text: z.string().optional().describe('Text content of the idea')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });

    let result = await client.createIdea({
      stormid: ctx.input.stormId,
      type: ctx.input.type,
      data: ctx.input.content,
      color: ctx.input.color
    });

    return {
      output: {
        ideaId: result.id,
        stormId: result.storm?.id,
        stormTitle: result.storm?.title,
        type: result.type,
        color: result.color,
        text: result.data?.text
      },
      message: `Created **${ctx.input.type}** idea in Storm ${ctx.input.stormId}.`
    };
  })
  .build();
