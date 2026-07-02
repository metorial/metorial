import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { elevenLabsServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  audioAttachment,
  audioOutput,
  audioOutputSchema,
  voiceSettingsSchema
} from './shared';

export let createDialogue = SlateTool.create(spec, {
  name: 'Create Dialogue',
  key: 'create_dialogue',
  description: `Convert multiple text and voice pairs into a single natural-sounding dialogue audio file. Returns generated audio as a Slate attachment.`,
  instructions: [
    'Use list_voices first when you need voice IDs.',
    'Keep total dialogue text at or below 2,000 characters for reliable generation.'
  ],
  constraints: ['Maximum 10 unique voice IDs per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inputs: z
        .array(
          z.object({
            text: z.string().describe('Dialogue text for this turn'),
            voiceId: z.string().describe('Voice ID for this turn')
          })
        )
        .min(1)
        .describe('Dialogue turns to synthesize in order'),
      modelId: z.string().optional().describe('Dialogue model ID. Defaults to eleven_v3.'),
      languageCode: z
        .string()
        .optional()
        .describe('ISO 639-1 language code to enforce for the model'),
      outputFormat: z.string().optional().describe('Audio output format, e.g. mp3_44100_128'),
      settings: voiceSettingsSchema
        .optional()
        .describe('Dialogue generation settings for this request')
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let uniqueVoiceIds = new Set(ctx.input.inputs.map(input => input.voiceId));
    if (uniqueVoiceIds.size > 10) {
      throw elevenLabsServiceError('create_dialogue supports at most 10 unique voice IDs.');
    }

    let totalCharacters = ctx.input.inputs.reduce((sum, input) => sum + input.text.length, 0);
    if (totalCharacters > 2000) {
      throw elevenLabsServiceError(
        'create_dialogue input text must be 2,000 characters or fewer across all turns.'
      );
    }

    let client = new ElevenLabsClient(ctx.auth.token);
    let result = await client.createDialogue({
      inputs: ctx.input.inputs,
      modelId: ctx.input.modelId,
      languageCode: ctx.input.languageCode,
      outputFormat: ctx.input.outputFormat,
      settings: ctx.input.settings
    });

    return {
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Generated dialogue audio with ${ctx.input.inputs.length} turn(s) and ${uniqueVoiceIds.size} voice(s).`
    };
  })
  .build();
