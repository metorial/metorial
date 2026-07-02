import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { biteSchema, mapBite } from './shared';

export let getSoundbite = SlateTool.create(spec, {
  name: 'Get Soundbite',
  key: 'get_soundbite',
  description: `Retrieve a single Fireflies soundbite by ID, including source metadata, captions, media URLs, privacy settings, and creator information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      biteId: z.string().describe('The soundbite ID to retrieve')
    })
  )
  .output(biteSchema)
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let bite = await client.getBite(ctx.input.biteId);
    let output = mapBite(bite);

    return {
      output,
      message: `Retrieved soundbite **${output.name ?? output.biteId}**.`
    };
  })
  .build();
