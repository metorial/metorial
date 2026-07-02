import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Lists available voices from LMNT's voice library. Filter by ownership (system-provided, your custom voices, or all) and by starred status for quick access to favorites.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z
        .enum(['system', 'me', 'all'])
        .optional()
        .describe(
          'Filter voices by owner. "system" for pre-built voices, "me" for your custom voices, "all" for both. Defaults to all.'
        ),
      starred: z
        .boolean()
        .optional()
        .describe('If true, only returns voices you have starred.')
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().describe('Unique identifier for the voice.'),
            name: z.string().describe('Display name of the voice.'),
            owner: z.string().describe('Owner type: system, me, or other.'),
            state: z.string().describe('Training state (e.g. ready, training).'),
            description: z.string().optional().describe('Text description of the voice.'),
            gender: z
              .string()
              .optional()
              .describe('Gender tag (e.g. male, female, nonbinary).'),
            voiceType: z
              .string()
              .optional()
              .describe('Voice creation type: instant or professional.'),
            starred: z.boolean().optional().describe('Whether the voice is starred.'),
            previewUrl: z.string().optional().describe('URL to a preview audio sample.')
          })
        )
        .describe('List of available voices.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let voices = await client.listVoices({
      owner: ctx.input.owner,
      starred: ctx.input.starred
    });

    let mappedVoices = voices.map(v => ({
      voiceId: v.id,
      name: v.name,
      owner: v.owner,
      state: v.state,
      description: v.description,
      gender: v.gender,
      voiceType: v.type,
      starred: v.starred,
      previewUrl: v.preview_url
    }));

    return {
      output: { voices: mappedVoices },
      message: `Found **${mappedVoices.length}** voice(s)${ctx.input.owner ? ` owned by **${ctx.input.owner}**` : ''}.`
    };
  })
  .build();
