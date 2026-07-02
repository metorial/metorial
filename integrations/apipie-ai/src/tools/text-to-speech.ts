import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let textToSpeech = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into natural-sounding speech using TTS models from OpenAI and ElevenLabs. Access a wide range of voices and customize voice parameters.`,
  instructions: [
    'OpenAI voices: "alloy", "echo", "fable", "nova", "onyx", "shimmer". Models: "tts-1-hd", "tts-1-1106".',
    'ElevenLabs voices: "Rachel", "Domi", "Bella", "Antoni", "Elli", "Josh", "Arnold", "Adam", "Sam", and more. Models: "eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5".',
    'Use "voiceSettings" to fine-tune ElevenLabs voice characteristics.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'TTS model (e.g., "tts-1-hd", "eleven_multilingual_v2", "eleven_turbo_v2_5")'
        ),
      voice: z
        .string()
        .describe(
          'Voice name (OpenAI: "shimmer", "alloy", etc.; ElevenLabs: "Rachel", "Josh", etc.)'
        ),
      input: z.string().describe('Text to convert to speech'),
      provider: z
        .string()
        .optional()
        .describe('Provider to use (e.g., "openai", "elevenlabs"). Omit for auto-selection.'),
      responseFormat: z
        .enum(['mp3', 'opus', 'wav'])
        .optional()
        .describe('Audio output format. Defaults to "mp3".'),
      speed: z.number().optional().describe('Playback speed (OpenAI models only)'),
      voiceSettings: z
        .object({
          stability: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Voice stability (0-1). Lower is more expressive.'),
          similarityBoost: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Similarity to the original voice (0-1)'),
          style: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Speaking style intensity (0-1)'),
          useSpeakerBoost: z.boolean().optional().describe('Enable speaker boost for clarity')
        })
        .optional()
        .describe('ElevenLabs-specific voice tuning parameters')
    })
  )
  .output(
    z.object({
      audioUrl: z.string().optional().describe('URL of the generated audio file'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the audio (e.g., "audio/mpeg")'),
      textCharacters: z.number().optional().describe('Number of characters processed'),
      cost: z.number().optional().describe('Cost of this request in USD'),
      latencyMs: z.number().optional().describe('Response latency in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.textToSpeech({
      model: ctx.input.model,
      voice: ctx.input.voice,
      input: ctx.input.input,
      provider: ctx.input.provider,
      responseFormat: ctx.input.responseFormat,
      speed: ctx.input.speed,
      voiceSettings: ctx.input.voiceSettings
    });

    let data = response.data;
    let headers = response.headers;

    let audioUrl: string | undefined;
    let contentType: string | undefined;
    let textCharacters: number | undefined;
    let cost: number | undefined;
    let latencyMs: number | undefined;

    if (data?.audio) {
      audioUrl = data.audio.url;
      contentType = data.audio.content_type;
      textCharacters = data.usage?.text_characters;
      cost = data.usage?.cost;
      latencyMs = data.usage?.latency_ms;
    } else if (headers?.['x-audio-details']) {
      try {
        let details = JSON.parse(headers['x-audio-details']);
        cost = details.cost;
        latencyMs = details.latencyMs;
        textCharacters = details.promptChar;
      } catch {
        // Header parsing failed, continue without metadata
      }
    }

    return {
      output: {
        audioUrl,
        contentType,
        textCharacters,
        cost,
        latencyMs
      },
      message: `Generated speech using **${ctx.input.model}** with voice **${ctx.input.voice}**. ${textCharacters ? `${textCharacters} characters processed` : `${ctx.input.input.length} characters submitted`}${cost ? ` ($${cost.toFixed(6)})` : ''}.${audioUrl ? `\n\n[Listen to audio](${audioUrl})` : ''}`
    };
  })
  .build();
