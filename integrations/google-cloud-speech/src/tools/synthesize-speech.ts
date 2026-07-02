import { SlateTool } from 'slates';
import { z } from 'zod';
import { TextToSpeechClient } from '../lib/client';
import { googleCloudSpeechActionScopes } from '../scopes';
import { spec } from '../spec';

export let synthesizeSpeech = SlateTool.create(spec, {
  name: 'Synthesize Speech',
  key: 'synthesize_speech',
  description: `Convert text or SSML into natural-sounding speech audio using Google Cloud Text-to-Speech. Returns base64-encoded audio data in the requested format.

Supports multiple voice types including Standard, WaveNet, Neural2, Studio, and Chirp 3 HD voices. Customize pitch, speaking rate, and volume.`,
  instructions: [
    'Provide either plain text or SSML markup. If both are given, SSML takes precedence.',
    'Use the List Voices tool to discover available voice names and language codes.'
  ],
  constraints: ['Maximum input size is 5000 bytes.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.synthesizeSpeech)
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Plain text to synthesize. Provide this OR ssml, not both.'),
      ssml: z
        .string()
        .optional()
        .describe('SSML markup to synthesize. Takes precedence over text if both provided.'),
      languageCode: z
        .string()
        .describe('BCP-47 language code for the voice (e.g. "en-US", "de-DE", "ja-JP").'),
      voiceName: z
        .string()
        .optional()
        .describe(
          'Specific voice name (e.g. "en-US-Wavenet-D", "en-US-Neural2-A"). Use List Voices to find available names.'
        ),
      ssmlGender: z
        .enum(['MALE', 'FEMALE', 'NEUTRAL'])
        .optional()
        .describe('Voice gender preference. Used when voiceName is not specified.'),
      audioEncoding: z
        .enum(['MP3', 'LINEAR16', 'OGG_OPUS', 'MULAW', 'ALAW'])
        .default('MP3')
        .describe('Output audio encoding format.'),
      speakingRate: z
        .number()
        .optional()
        .describe('Speaking rate (0.25 to 4.0). 1.0 is normal speed.'),
      pitch: z
        .number()
        .optional()
        .describe('Pitch adjustment in semitones (-20.0 to 20.0). 0.0 is default.'),
      volumeGainDb: z
        .number()
        .optional()
        .describe('Volume gain in dB (-96.0 to 16.0). 0.0 is default.'),
      sampleRateHertz: z.number().optional().describe('Sample rate override in Hertz.'),
      effectsProfileId: z
        .array(z.string())
        .optional()
        .describe('Audio effects profile IDs (e.g. ["small-bluetooth-speaker-class-device"]).')
    })
  )
  .output(
    z.object({
      audioContent: z.string().describe('Base64-encoded audio data in the requested format.'),
      audioEncoding: z.string().describe('The audio encoding format used.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TextToSpeechClient({
      token: ctx.auth.token
    });

    let inputText = ctx.input.ssml || ctx.input.text;
    ctx.info(
      `Synthesizing speech for ${inputText ? `${inputText.substring(0, 50)}...` : 'empty input'}`
    );

    let response = await client.synthesize({
      text: ctx.input.text,
      ssml: ctx.input.ssml,
      languageCode: ctx.input.languageCode,
      voiceName: ctx.input.voiceName,
      ssmlGender: ctx.input.ssmlGender,
      audioEncoding: ctx.input.audioEncoding,
      speakingRate: ctx.input.speakingRate,
      pitch: ctx.input.pitch,
      volumeGainDb: ctx.input.volumeGainDb,
      sampleRateHertz: ctx.input.sampleRateHertz,
      effectsProfileId: ctx.input.effectsProfileId
    });

    return {
      output: {
        audioContent: response.audioContent || '',
        audioEncoding: ctx.input.audioEncoding
      },
      message: `Speech synthesized successfully in **${ctx.input.audioEncoding}** format for language **${ctx.input.languageCode}**.`
    };
  })
  .build();
