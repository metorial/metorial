import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateVoice = SlateTool.create(spec, {
  name: 'Update Voice',
  key: 'update_voice',
  description: `Updates metadata for an LMNT voice. Change the name, description, gender tag, or starred status. Can also unfreeze a frozen professional voice to upgrade it to the latest model. Only provided fields will be updated.`,
  instructions: [
    'Professional voices that are not being used may enter a frozen state. Use **unfreeze** to upgrade them to the latest model.',
    'Instant voices always use the latest model and are never frozen.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('The unique identifier of the voice to update.'),
      name: z.string().optional().describe('New display name for the voice.'),
      description: z.string().optional().describe('New text description of the voice.'),
      gender: z
        .string()
        .optional()
        .describe('Gender tag (e.g. male, female, nonbinary). Descriptive only.'),
      starred: z
        .boolean()
        .optional()
        .describe('If true, adds this voice to your starred list.'),
      unfreeze: z
        .boolean()
        .optional()
        .describe(
          'If true, unfreezes a frozen professional voice and upgrades it to the latest model.'
        )
    })
  )
  .output(
    z.object({
      voiceId: z.string().describe('Unique identifier for the voice.'),
      name: z.string().describe('Display name of the voice.'),
      owner: z.string().describe('Owner type: system, me, or other.'),
      state: z.string().describe('Training state (e.g. ready, training).'),
      description: z.string().optional().describe('Text description of the voice.'),
      gender: z.string().optional().describe('Gender tag.'),
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

    let voice = await client.updateVoice(ctx.input.voiceId, {
      name: ctx.input.name,
      description: ctx.input.description,
      gender: ctx.input.gender,
      starred: ctx.input.starred,
      unfreeze: ctx.input.unfreeze
    });

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
      message: `Updated voice **${voice.name}** (\`${voice.id}\`).`
    };
  })
  .build();
