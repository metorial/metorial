import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let createVoiceFromPreviewTool = SlateTool.create(spec, {
  name: 'Create Voice From Preview',
  key: 'create_voice_from_preview',
  description:
    'Save a voice preview to your library so it can be used for speech generation. Call design_voice_previews to obtain a generated voice ID.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      generatedVoiceId: z.string().describe('Generated voice ID from design_voice_previews'),
      voiceName: z.string().describe('Name for the saved voice'),
      voiceDescription: z
        .string()
        .min(20)
        .max(1000)
        .describe('Description of the saved voice'),
      labels: z.record(z.string(), z.string()).optional().describe('Voice metadata labels')
    })
  )
  .output(
    z.object({
      voiceId: z.string().describe('Saved voice ID for speech generation'),
      name: z.string().optional(),
      category: z.string().optional(),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let voice = await new ElevenLabsClient(ctx.auth.token).createVoiceFromPreview(ctx.input);
    return {
      output: {
        voiceId: voice.voice_id,
        name: voice.name ?? undefined,
        category: voice.category ?? undefined,
        raw: voice.raw
      },
      message: `Saved voice \`${voice.voice_id}\` to the voice library.`
    };
  })
  .build();
