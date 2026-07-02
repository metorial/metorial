import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let designVoiceTool = SlateTool.create(spec, {
  name: 'Design Voice',
  key: 'design_voice',
  description: `Create a new voice from a text description. Returns voice previews with audio samples and generated voice IDs that can be used for text-to-speech.`,
  instructions: [
    'Provide a detailed description of the desired voice characteristics (age, gender, accent, tone, etc.).',
    'Optionally provide sample text (100-1000 chars) to preview the generated voice.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      voiceDescription: z
        .string()
        .describe(
          'Description of the voice to design (e.g. "A warm female voice with a British accent, mid-30s, calm and professional")'
        ),
      text: z
        .string()
        .optional()
        .describe(
          'Sample text (100-1000 characters) to preview the voice. If not provided, set autoGenerateText to true'
        ),
      autoGenerateText: z
        .boolean()
        .optional()
        .describe('Automatically generate sample text if none is provided'),
      modelId: z.string().optional().describe('Model ID for voice generation')
    })
  )
  .output(
    z.object({
      previews: z
        .array(
          z.object({
            generatedVoiceId: z.string().describe('ID of the generated voice preview'),
            audioBase64: z.string().describe('Base64-encoded audio preview'),
            mediaType: z.string().describe('MIME type of the audio'),
            durationSecs: z.number().describe('Duration of the preview in seconds')
          })
        )
        .describe('Generated voice previews'),
      text: z.string().optional().describe('The text used for previewing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.designVoice({
      voiceDescription: ctx.input.voiceDescription,
      text: ctx.input.text,
      modelId: ctx.input.modelId,
      autoGenerateText: ctx.input.autoGenerateText
    });

    let previews = (result.previews || []).map((p: any) => ({
      generatedVoiceId: p.generated_voice_id,
      audioBase64: p.audio_base_64,
      mediaType: p.media_type,
      durationSecs: p.duration_secs
    }));

    return {
      output: {
        previews,
        text: result.text
      },
      message: `Designed ${previews.length} voice preview(s) from description. Use the generatedVoiceId to reference the voice.`
    };
  })
  .build();
