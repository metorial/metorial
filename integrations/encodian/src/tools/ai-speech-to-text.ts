import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let aiSpeechToText = SlateTool.create(spec, {
  name: 'AI Speech to Text',
  key: 'ai_speech_to_text',
  description: `Convert speech from audio files to text using AI. Supports multiple languages and locales with configurable punctuation, profanity filtering, and speaker identification.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded audio file content'),
      locale: z.string().optional().describe('Language/locale code (default: en-US)'),
      punctuationMode: z
        .enum(['None', 'Dictated', 'Automatic', 'DictatedAndAutomatic'])
        .optional()
        .describe('Punctuation mode'),
      profanityFilterMode: z
        .enum(['None', 'Masked', 'Removed'])
        .optional()
        .describe('Profanity filter mode'),
      speakerIdentification: z
        .enum(['JSON', 'Simplified', 'None'])
        .optional()
        .describe('Speaker identification format'),
      numberOfSpeakers: z.number().optional().describe('Expected number of speakers (2-35)')
    })
  )
  .output(
    z.object({
      transcribedText: z.string().describe('Transcribed text from the audio file'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      fileContent: ctx.input.fileContent,
      locale: ctx.input.locale || 'en-US'
    };

    if (ctx.input.punctuationMode) body.punctuationMode = ctx.input.punctuationMode;
    if (ctx.input.profanityFilterMode)
      body.profanityFilterMode = ctx.input.profanityFilterMode;
    if (ctx.input.speakerIdentification)
      body.speakerIdentification = ctx.input.speakerIdentification;
    if (ctx.input.numberOfSpeakers) body.numberOfSpeakers = ctx.input.numberOfSpeakers;

    let result = await client.aiSpeechToText(body);

    return {
      output: {
        transcribedText: result.text || result.Text || result.result || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully transcribed audio to text.`
    };
  })
  .build();
