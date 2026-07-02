import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCharacter = SlateTool.create(spec, {
  name: 'Get Character',
  key: 'get_character',
  description: `Retrieve detailed information about a specific public ChatFAI character by its ID. Use this to get a character's full bio, genre, greeting, and other details before starting a conversation.`,
  instructions: [
    "You can find a character's ID from the ChatFAI character page URL: https://chatfai.com/characters/{characterId}"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      characterId: z.string().describe('Unique ID of the character to retrieve')
    })
  )
  .output(
    z.object({
      characterId: z.string().describe('Unique identifier of the character'),
      name: z.string().describe('Name of the character'),
      bio: z.string().describe('Biography or personality description of the character'),
      genre: z.string().describe('Genre category of the character'),
      imageUrl: z.string().optional().describe('URL of the character image'),
      greeting: z.string().optional().describe('Default greeting message from the character')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let character = await client.getCharacter(ctx.input.characterId);

    let output = {
      characterId: character.id,
      name: character.name,
      bio: character.bio,
      genre: character.genre,
      imageUrl: character.imageUrl,
      greeting: character.greeting
    };

    return {
      output,
      message: `Retrieved character **${character.name}** (${character.genre}).`
    };
  })
  .build();
