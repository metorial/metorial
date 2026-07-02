import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let getVoice = SlateTool.create(spec, {
  name: 'Get Voice',
  key: 'get_voice',
  description: `Retrieve detailed metadata and settings for a specific voice by its ID. Includes voice properties, labels, and current settings like stability and similarity.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to retrieve')
    })
  )
  .output(
    z.object({
      voiceId: z.string().describe('Unique voice identifier'),
      name: z.string().describe('Voice display name'),
      category: z.string().optional().describe('Voice category'),
      description: z.string().optional().describe('Voice description'),
      labels: z.record(z.string(), z.string()).optional().describe('Voice labels/tags'),
      previewUrl: z.string().optional().describe('URL to preview audio sample'),
      settings: z
        .object({
          stability: z.number().optional().describe('Voice stability setting'),
          similarityBoost: z.number().optional().describe('Similarity boost setting'),
          style: z.number().optional().describe('Style exaggeration setting'),
          useSpeakerBoost: z.boolean().optional().describe('Speaker boost enabled'),
          speed: z.number().optional().describe('Voice speed setting')
        })
        .optional()
        .describe('Current voice settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let data = (await client.getVoice(ctx.input.voiceId)) as Record<string, unknown>;
    let settingsData = data.settings as Record<string, unknown> | undefined;

    return {
      output: {
        voiceId: data.voice_id as string,
        name: data.name as string,
        category: data.category as string | undefined,
        description: data.description as string | undefined,
        labels: data.labels as Record<string, string> | undefined,
        previewUrl: data.preview_url as string | undefined,
        settings: settingsData
          ? {
              stability: settingsData.stability as number | undefined,
              similarityBoost: settingsData.similarity_boost as number | undefined,
              style: settingsData.style as number | undefined,
              useSpeakerBoost: settingsData.use_speaker_boost as boolean | undefined,
              speed: settingsData.speed as number | undefined
            }
          : undefined
      },
      message: `Retrieved voice **${data.name}** (\`${data.voice_id}\`), category: ${data.category || 'N/A'}.`
    };
  })
  .build();
