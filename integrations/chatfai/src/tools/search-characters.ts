import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCharacters = SlateTool.create(spec, {
  name: 'Search Characters',
  key: 'search_characters',
  description: `Search for public AI characters on ChatFAI by name or keyword. Returns a list of matching characters from ChatFAI's catalog, spanning genres like anime, manga, books, cartoons, comics, games, history, and TV shows & movies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query to find characters by name or keyword')
    })
  )
  .output(
    z.object({
      characters: z
        .array(
          z.object({
            characterId: z.string().describe('Unique identifier of the character'),
            name: z.string().describe('Name of the character'),
            bio: z.string().describe('Biography or personality description of the character'),
            genre: z.string().describe('Genre category of the character'),
            imageUrl: z.string().optional().describe('URL of the character image'),
            greeting: z
              .string()
              .optional()
              .describe('Default greeting message from the character')
          })
        )
        .describe('List of matching characters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let characters = await client.searchCharacters(ctx.input.query);

    let mapped = characters.map(c => ({
      characterId: c.id,
      name: c.name,
      bio: c.bio,
      genre: c.genre,
      imageUrl: c.imageUrl,
      greeting: c.greeting
    }));

    return {
      output: { characters: mapped },
      message: `Found **${mapped.length}** character(s) matching "${ctx.input.query}".`
    };
  })
  .build();
