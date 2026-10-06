import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { addModelFiles, publicFalFileUrl, requireFalFile } from '../lib/files';
import { spec } from '../spec';

export let generateSpeech = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Generate speech audio from text using Fal.ai text-to-speech models.
Model-specific options support language selection and reference-audio voice cloning when available.
Provides a downloadable audio file. Inspect endpoint inputs with search_models using includeSchema=true.`,
  instructions: [
    'For fal-ai/f5-tts, provide referenceAudioUrl; model_type defaults to F5-TTS. For other models use additionalParams for their documented reference or voice fields.',
    'Use an appropriate TTS model endpoint for the modelId parameter.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileRetentionSeconds: z
        .number()
        .int()
        .min(60)
        .max(31536000)
        .optional()
        .describe(
          'Generated file lifetime in seconds. Omit to use account defaults; expired files cannot be recovered'
        ),
      modelId: z.string().min(1).describe('Model endpoint ID for TTS, e.g. "fal-ai/f5-tts"'),
      text: z.string().min(1).describe('Text to convert to speech'),
      textParameter: z
        .enum(['text', 'gen_text', 'prompt'])
        .optional()
        .describe(
          'Provider text field. Defaults to gen_text for fal-ai/f5-tts and text for other endpoints; consult the endpoint schema'
        ),
      referenceAudioUrl: z
        .string()
        .optional()
        .describe('F5-TTS reference audio URL for voice cloning; required by fal-ai/f5-tts'),
      referenceText: z
        .string()
        .optional()
        .describe('F5-TTS reference transcript; other models may use additionalParams'),
      language: z.string().optional().describe('Language code for the speech output'),
      additionalParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional model-specific parameters')
    })
  )
  .output(
    z.object({
      audioUrl: z.string().optional().describe('Provider URL when the audio is hosted'),
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
      ...(ctx.input.additionalParams || {}),
      [ctx.input.textParameter ??
        (ctx.input.modelId.startsWith('fal-ai/f5-tts') ? 'gen_text' : 'text')]: ctx.input.text
    };

    if (ctx.input.referenceAudioUrl) input.ref_audio_url = ctx.input.referenceAudioUrl;
    if (ctx.input.referenceText) input.ref_text = ctx.input.referenceText;
    if (ctx.input.language) input.language = ctx.input.language;

    if (ctx.input.modelId.startsWith('fal-ai/f5-tts')) {
      input.model_type ??= 'F5-TTS';
      if (!input.ref_audio_url)
        throw createApiServiceError(
          'fal-ai/f5-tts requires referenceAudioUrl for voice cloning.'
        );
    }
    ctx.progress('Generating speech...');
    let result = await client.runModel(ctx.input.modelId, input, {
      fileRetentionSeconds: ctx.input.fileRetentionSeconds
    });

    const audio = requireFalFile(
      result.audio ?? result.audio_url ?? result.audios?.[0],
      'audio'
    );
    const audioUrl = publicFalFileUrl(audio);
    const contentType = audio.content_type ?? result.content_type ?? undefined;
    const duration = audio.duration ?? result.duration ?? undefined;
    await addModelFiles(ctx, { file: audio, result });

    return {
      output: {
        audioUrl,
        contentType,
        duration,
        timings: result.timings ?? undefined
      },
      message: `Generated downloadable speech audio using **${ctx.input.modelId}**.`
    };
  })
  .build();
