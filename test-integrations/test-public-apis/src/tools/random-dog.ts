import { SlateTool } from 'slates';
import { z } from 'zod';
import { dogCeoAxios } from '../clients';
import { spec } from '../spec';

export let randomDog = SlateTool.create(spec, {
  name: 'Random Dog',
  key: 'random_dog',
  description: `Fetch a random dog image URL from the free Dog CEO API (https://dog.ceo).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      breed: z
        .string()
        .optional()
        .describe('Optional breed slug (e.g. "husky", "hound/afghan"). Omit for any breed.')
    })
  )
  .output(
    z.object({
      imageUrl: z.string(),
      breed: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let path = ctx.input.breed
      ? `/breed/${ctx.input.breed.trim().toLowerCase().replace(/\s+/g, '/')}/images/random`
      : '/breeds/image/random';
    let response = await dogCeoAxios.get(path);
    let data = response.data;

    if (data?.status !== 'success' || typeof data.message !== 'string') {
      throw new Error(`Dog CEO API returned an unexpected response: ${JSON.stringify(data)}`);
    }

    return {
      output: {
        imageUrl: data.message,
        breed: ctx.input.breed ?? null
      },
      message: ctx.input.breed
        ? `Random **${ctx.input.breed}** dog: ${data.message}`
        : `Random dog: ${data.message}`
    };
  })
  .build();
