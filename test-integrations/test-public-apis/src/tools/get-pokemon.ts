import { SlateTool } from 'slates';
import { z } from 'zod';
import { pokemonAxios } from '../clients';
import { spec } from '../spec';

export let getPokemon = SlateTool.create(spec, {
  name: 'Get Pokémon',
  key: 'get_pokemon',
  description: `Look up a Pokémon on the free PokéAPI (https://pokeapi.co) by name (lowercased) or numeric Pokédex ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nameOrId: z
        .string()
        .min(1)
        .describe('Pokémon name (lowercased, e.g. "pikachu") or Pokédex ID (e.g. "25").')
    })
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      types: z.array(z.string()),
      abilities: z.array(z.string()),
      heightDecimeters: z.number(),
      weightHectograms: z.number(),
      baseExperience: z.number().nullable(),
      spriteUrl: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let slug = encodeURIComponent(ctx.input.nameOrId.trim().toLowerCase());
    let response = await pokemonAxios.get(`/pokemon/${slug}`);
    let data = response.data;

    let types: string[] = Array.isArray(data.types)
      ? data.types.map((t: any) => t?.type?.name).filter((v: unknown): v is string => !!v)
      : [];
    let abilities: string[] = Array.isArray(data.abilities)
      ? data.abilities
          .map((a: any) => a?.ability?.name)
          .filter((v: unknown): v is string => !!v)
      : [];

    let spriteUrl: string | null =
      data.sprites?.other?.['official-artwork']?.front_default ??
      data.sprites?.front_default ??
      null;

    return {
      output: {
        id: Number(data.id),
        name: String(data.name),
        types,
        abilities,
        heightDecimeters: Number(data.height ?? 0),
        weightHectograms: Number(data.weight ?? 0),
        baseExperience: typeof data.base_experience === 'number' ? data.base_experience : null,
        spriteUrl
      },
      message: `**#${data.id} ${data.name}** — ${types.join('/') || 'unknown type'}.`
    };
  })
  .build();
