import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

export let deleteGeneration = SlateTool.create(spec, {
  name: 'Delete Generation',
  key: 'delete_generation',
  description:
    'Permanently delete a generated image, PDF, or video from Placid using its generation ID.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      generationType: z.enum(['image', 'pdf', 'video']).describe('Type of generated file'),
      generationId: z.number().describe('Generation ID returned when creating the file')
    })
  )
  .output(
    z.object({
      generationType: z.enum(['image', 'pdf', 'video']),
      generationId: z.number(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });
    switch (ctx.input.generationType) {
      case 'image':
        await client.deleteImage(ctx.input.generationId);
        break;
      case 'pdf':
        await client.deletePdf(ctx.input.generationId);
        break;
      case 'video':
        await client.deleteVideo(ctx.input.generationId);
        break;
    }
    return {
      output: {
        generationType: ctx.input.generationType,
        generationId: ctx.input.generationId,
        deleted: true
      },
      message: `Deleted ${ctx.input.generationType} **#${ctx.input.generationId}**.`
    };
  })
  .build();
