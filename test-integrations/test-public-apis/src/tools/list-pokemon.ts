import { SlateTool } from 'slates';
import { z } from 'zod';
import { pokemonAxios } from '../clients';
import { spec } from '../spec';

export let listPokemon = SlateTool.create(spec, {
  name: 'List Pokémon',
  key: 'list_pokemon',
  description: `List Pokémon names with optional paging on the free PokéAPI (https://pokeapi.co).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('How many names to return.'),
      offset: z.number().int().min(0).default(0).describe('Offset into the list.')
    })
  )
  .output(
    z.object({
      count: z.number(),
      next: z.string().nullable(),
      previous: z.string().nullable(),
      results: z.array(z.object({ name: z.string(), url: z.string() }))
    })
  )
  .handleInvocation(async ctx => {
    let response = await pokemonAxios.get('/pokemon', {
      params: { limit: ctx.input.limit, offset: ctx.input.offset }
    });
    let data = response.data;

    let results: { name: string; url: string }[] = Array.isArray(data.results)
      ? data.results
          .map((r: any) => ({ name: String(r?.name ?? ''), url: String(r?.url ?? '') }))
          .filter((r: { name: string }) => r.name)
      : [];

    return {
      output: {
        count: Number(data.count ?? 0),
        next: data.next ?? null,
        previous: data.previous ?? null,
        results
      },
      message: `Returned **${results.length}** Pokémon (offset **${ctx.input.offset}**, total **${data.count ?? 'unknown'}**).`
    };
  })
  .build();
