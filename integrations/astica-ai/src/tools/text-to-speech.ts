import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaVoiceClient } from '../lib/client';
import { getSpeechAudio, mapSpeechResult, speechOutputSchema } from '../lib/speech';
import { spec } from '../spec';

export let textToSpeechTool = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text to natural-sounding speech audio using Astica's voice AI. Choose from 500+ voices across multiple categories including expressive, programmable, neural, and cloned voices.
Provides downloadable WAV audio and optionally word-level timestamps for precise playback synchronization. Low-priority requests return a task ID to retrieve with get_speech_task.`,
  instructions: [
    'Specify a voice identifier (e.g., "expressive_ava", "prog_avery", "neural_jennifer").',
    'For programmable voices, use the stylePrompt parameter to shape the voice personality with natural language.',
    'Enable timestamps with expressive voices to get word-level timing data for synchronized playback.',
    'Low-priority mode supports expressive voices and custom clones. Retrieve queued audio with get_speech_task.'
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
      lowPriority: z
        .boolean()
        .optional()
        .describe(
          'Queue an expressive voice or custom clone for lower cost; retrieve its task ID with get_speech_task'
        )
    })
  )
  .output(speechOutputSchema)
  .handleInvocation(async ctx => {
    let voice = ctx.input.voice || 'expressive_ava';
    if (ctx.input.lowPriority && /^(neural_|prog_)/.test(voice)) {
      throw createApiServiceError(
        'Low-priority speech supports expressive voices and custom clones. Select one of those voices or disable lowPriority.'
      );
    }
    let client = new AsticaVoiceClient(ctx.auth.token);

    ctx.info(`Converting text to speech with voice: ${ctx.input.voice || 'expressive_ava'}`);

    let result = await client.textToSpeech({
      text: ctx.input.text,
      voice: ctx.input.voice,
      timestamps: ctx.input.timestamps,
      prompt: ctx.input.stylePrompt,
      lowPriority: ctx.input.lowPriority
    });

    let output = mapSpeechResult(result);
    let audio = getSpeechAudio(output);
    if (audio) {
      await ctx.addAttachment({ type: 'content', content: audio, filename: 'speech.wav' });
    }

    if (output.status === 'queued' && !output.taskId) {
      throw createApiServiceError(
        'Astica queued the speech request without returning a task ID.'
      );
    }

    return {
      output,
      message:
        output.taskId && !audio
          ? `Speech queued. Use get_speech_task with task ID "${output.taskId}" to retrieve the audio.`
          : audio
            ? `Text-to-speech conversion completed using voice "${output.voice || voice}" (${output.engine || 'unknown'} engine). Audio format: ${output.audioFormat || 'wav'}.`
            : `Speech request status: ${output.status}.`
    };
  })
  .build();
