import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVoice = SlateTool.create(spec, {
  name: 'Get Voice',
  key: 'get_voice',
  description: `Retrieves detailed information about a specific LMNT voice by its ID, including name, state, type, gender, and preview audio URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('The unique identifier of the voice to retrieve.')
    })
  )
  .output(
    z.object({
      voiceId: z.string().describe('Unique identifier for the voice.'),
      name: z.string().describe('Display name of the voice.'),
      owner: z.string().describe('Owner type: system, me, or other.'),
      state: z.string().describe('Training state (e.g. ready, training).'),
      description: z.string().optional().describe('Text description of the voice.'),
      gender: z.string().optional().describe('Gender tag (e.g. male, female, nonbinary).'),
      voiceType: z
        .string()
        .optional()
        .describe('Voice creation type: instant or professional.'),
      starred: z.boolean().optional().describe('Whether the voice is starred.'),
      previewUrl: z.string().optional().describe('URL to a preview audio sample.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let voice = await client.getVoice(ctx.input.voiceId);

    return {
      output: {
        voiceId: voice.id,
        name: voice.name,
        owner: voice.owner,
        state: voice.state,
        description: voice.description,
        gender: voice.gender,
        voiceType: voice.type,
        starred: voice.starred,
        previewUrl: voice.preview_url
      },
      message: `Retrieved voice **${voice.name}** (\`${voice.id}\`), state: **${voice.state}**, type: **${voice.type ?? 'unknown'}**.`
    };
  })
  .build();
