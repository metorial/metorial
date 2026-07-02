import { SlateTool } from 'slates';
import { z } from 'zod';
import { catFactAxios } from '../clients';
import { spec } from '../spec';

export let randomCatFact = SlateTool.create(spec, {
  name: 'Random Cat Fact',
  key: 'random_cat_fact',
  description: `Fetch a random cat fact from the free Cat Facts API (https://catfact.ninja).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      maxLength: z
        .number()
        .int()
        .min(20)
        .max(1000)
        .optional()
        .describe('Maximum fact length in characters.')
    })
  )
  .output(
    z.object({
      fact: z.string(),
      length: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let response = await catFactAxios.get('/fact', {
      params: ctx.input.maxLength ? { max_length: ctx.input.maxLength } : undefined
    });
    let data = response.data;

    let fact = typeof data?.fact === 'string' ? data.fact : '';
    let length = typeof data?.length === 'number' ? data.length : fact.length;

    if (!fact) {
      throw new Error(
        `Cat Facts API returned an unexpected response: ${JSON.stringify(data)}`
      );
    }

    return {
      output: { fact, length },
      message: `Cat fact: *${fact}*`
    };
  })
  .build();
