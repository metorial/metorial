import { SlateTool } from 'slates';
import { z } from 'zod';
import { chuckNorrisAxios } from '../clients';
import { spec } from '../spec';

export let randomJoke = SlateTool.create(spec, {
  name: 'Random Joke',
  key: 'random_joke',
  description: `Fetch a random Chuck Norris joke from the free Chuck Norris API (https://api.chucknorris.io).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .string()
        .optional()
        .describe(
          'Optional category to filter by (e.g. "animal", "dev", "food"). Omit for any category.'
        )
    })
  )
  .output(
    z.object({
      id: z.string(),
      value: z.string(),
      url: z.string(),
      categories: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let response = await chuckNorrisAxios.get('/jokes/random', {
      params: ctx.input.category ? { category: ctx.input.category } : undefined
    });
    let data = response.data;

    let value = typeof data?.value === 'string' ? data.value : '';
    if (!value) {
      throw new Error(
        `Chuck Norris API returned an unexpected response: ${JSON.stringify(data)}`
      );
    }

    return {
      output: {
        id: String(data.id ?? ''),
        value,
        url: String(data.url ?? ''),
        categories: Array.isArray(data.categories) ? data.categories.map(String) : []
      },
      message: `> ${value}`
    };
  })
  .build();
