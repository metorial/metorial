import { SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaVoiceClient } from '../lib/client';
import { spec } from '../spec';

export let textToSpeechTool = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text to natural-sounding speech audio using Astica's voice AI. Choose from 500+ voices across multiple categories including expressive, programmable, neural, and cloned voices.
Returns Base64-encoded WAV audio and optionally word-level timestamps for precise playback synchronization.`,
  instructions: [
    'Specify a voice identifier (e.g., "expressive_ava", "prog_avery", "neural_jennifer").',
    'For programmable voices, use the stylePrompt parameter to shape the voice personality with natural language.',
    'Enable timestamps to get word-level timing data for synchronized playback.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text content to synthesize into speech'),
      voice: z
        .string()
        .optional()
        .describe(
          'Voice identifier (e.g., "expressive_ava", "prog_avery", "neural_jennifer"). Defaults to "expressive_ava".'
        ),
      timestamps: z
        .boolean()
        .optional()
        .describe('Include word-level timing data in the response'),
      stylePrompt: z
        .string()
        .optional()
        .describe('Natural-language persona instructions for programmable voices only'),
      lowPriority: z.boolean().optional().describe('Use low-priority mode for lower cost')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      engine: z.string().optional().describe('Voice engine used'),
      voice: z.string().optional().describe('Voice identifier used'),
      audioBase64: z.string().optional().describe('Base64-encoded WAV audio data'),
      audioFormat: z.string().optional().describe('Audio format (e.g., "wav")'),
      costUnits: z.number().optional().describe('API usage cost units'),
      timestamps: z
        .array(
          z.object({
            text: z.string(),
            startSeconds: z.number(),
            stopSeconds: z.number()
          })
        )
        .optional()
        .describe('Word-level timestamps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AsticaVoiceClient(ctx.auth.token);

    ctx.info(`Converting text to speech with voice: ${ctx.input.voice || 'expressive_ava'}`);

    let result = await client.textToSpeech({
      text: ctx.input.text,
      voice: ctx.input.voice,
      timestamps: ctx.input.timestamps,
      prompt: ctx.input.stylePrompt,
      lowPriority: ctx.input.lowPriority
    });

    let timestamps = result.meta?.timestamps?.map((t: any) => ({
      text: t.text,
      startSeconds: t.start_s,
      stopSeconds: t.stop_s
    }));

    return {
      output: {
        status: result.status || 'unknown',
        engine: result.engine,
        voice: result.voice,
        audioBase64: result.audio_b64,
        audioFormat: result.audio_format,
        costUnits: result.cost_units,
        timestamps
      },
      message: `Text-to-speech conversion completed using voice "${result.voice || ctx.input.voice || 'expressive_ava'}" (${result.engine || 'unknown'} engine). Audio format: ${result.audio_format || 'wav'}.`
    };
  })
  .build();
