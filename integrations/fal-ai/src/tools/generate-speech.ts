import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let generateSpeech = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Generate speech audio from text using Fal.ai text-to-speech models.
Supports multiple languages, custom pronunciation, and voice cloning via reference audio.
Returns a URL to the generated audio file.`,
  instructions: [
    'Provide a referenceAudioUrl for voice cloning.',
    'Use an appropriate TTS model endpoint for the modelId parameter.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('Model endpoint ID for TTS, e.g. "fal-ai/f5-tts"'),
      text: z.string().describe('Text to convert to speech'),
      referenceAudioUrl: z
        .string()
        .optional()
        .describe('Reference audio URL for voice cloning'),
      referenceText: z
        .string()
        .optional()
        .describe('Transcript of the reference audio for voice cloning'),
      language: z.string().optional().describe('Language code for the speech output'),
      additionalParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional model-specific parameters')
    })
  )
  .output(
    z.object({
      audioUrl: z.string().describe('URL of the generated audio file on fal CDN'),
      contentType: z.string().optional().describe('MIME type of the generated audio'),
      duration: z.number().optional().describe('Duration of the generated audio in seconds'),
      timings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Timing information for the generation process')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    let input: Record<string, any> = {
      gen_text: ctx.input.text,
      ...(ctx.input.additionalParams || {})
    };

    if (ctx.input.referenceAudioUrl) input.ref_audio_url = ctx.input.referenceAudioUrl;
    if (ctx.input.referenceText) input.ref_text = ctx.input.referenceText;
    if (ctx.input.language) input.language = ctx.input.language;

    ctx.progress('Generating speech...');
    let result = await client.runModel(ctx.input.modelId, input);

    let audioUrl = result.audio?.url || result.audio_url || result.audios?.[0]?.url || '';
    let contentType = result.audio?.content_type || result.content_type;
    let duration = result.audio?.duration || result.duration;

    return {
      output: {
        audioUrl,
        contentType,
        duration,
        timings: result.timings
      },
      message: `Generated speech audio using **${ctx.input.modelId}**.\n- ${audioUrl}`
    };
  })
  .build();
