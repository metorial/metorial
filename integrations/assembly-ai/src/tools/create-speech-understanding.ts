import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assemblyAiServiceError } from '../lib/errors';
import { spec } from '../spec';

let speakerSchema = z.object({
  name: z.string().optional().describe('Known speaker name.'),
  role: z.string().optional().describe('Known speaker role.'),
  description: z.string().optional().describe('Context describing the speaker.'),
  company: z.string().optional().describe('Speaker company or organization.'),
  title: z.string().optional().describe('Speaker title.')
});

let customFormattingSchema = z.object({
  date: z.string().optional().describe('Desired date format, such as "mm/dd/yyyy".'),
  phoneNumber: z
    .string()
    .optional()
    .describe('Desired phone number format, such as "(xxx)xxx-xxxx".'),
  email: z.string().optional().describe('Desired email format.')
});

export let createSpeechUnderstanding = SlateTool.create(spec, {
  name: 'Create Speech Understanding',
  key: 'create_speech_understanding',
  description: `Apply AssemblyAI Speech Understanding to a completed transcript. Supports translation, advanced speaker identification, and custom formatting in one request.`,
  instructions: [
    'The transcript must already be completed.',
    'Provide at least one capability: targetLanguages, speakerType/speakers, or customFormatting.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('Completed AssemblyAI transcript ID to process.'),
      targetLanguages: z
        .array(z.string())
        .optional()
        .describe('Language codes to translate the transcript into, such as ["es", "de"].'),
      formal: z
        .boolean()
        .optional()
        .describe('Use formal translation tone when targetLanguages is provided.'),
      matchOriginalUtterance: z
        .boolean()
        .optional()
        .describe(
          'Return translated utterances aligned to original utterances when targetLanguages is provided.'
        ),
      speakerType: z
        .enum(['name', 'role'])
        .optional()
        .describe('Speaker identification type to map diarized labels to names or roles.'),
      speakers: z
        .array(speakerSchema)
        .optional()
        .describe('Known speakers to help speaker identification.'),
      customFormatting: customFormattingSchema
        .optional()
        .describe('Formatting preferences for dates, phone numbers, and emails.')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Transcript ID that was processed.'),
      speechUnderstanding: z
        .any()
        .optional()
        .describe('Speech Understanding request and response status details.'),
      translatedTexts: z
        .record(z.string(), z.string())
        .optional()
        .describe('Translated text keyed by target language.'),
      utterances: z
        .array(z.any())
        .optional()
        .describe('Utterances returned by Speech Understanding.'),
      words: z.array(z.any()).optional().describe('Words returned by Speech Understanding.')
    })
  )
  .handleInvocation(async ctx => {
    let hasTranslation = Boolean(ctx.input.targetLanguages?.length);
    let hasSpeakerIdentification = Boolean(
      ctx.input.speakerType || ctx.input.speakers?.length
    );
    let hasCustomFormatting =
      ctx.input.customFormatting !== undefined &&
      Object.values(ctx.input.customFormatting).some(value => value !== undefined);

    if (!hasTranslation && !hasSpeakerIdentification && !hasCustomFormatting) {
      throw assemblyAiServiceError(
        'Provide targetLanguages, speakerType/speakers, or customFormatting.'
      );
    }

    if ((ctx.input.formal || ctx.input.matchOriginalUtterance) && !hasTranslation) {
      throw assemblyAiServiceError(
        'formal and matchOriginalUtterance require targetLanguages.'
      );
    }

    if (ctx.input.speakers?.length && !ctx.input.speakerType) {
      throw assemblyAiServiceError('speakerType is required when speakers are provided.');
    }

    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createSpeechUnderstanding(ctx.input);

    return {
      output: {
        transcriptId: ctx.input.transcriptId,
        speechUnderstanding: result.speech_understanding,
        translatedTexts: result.translated_texts,
        utterances: result.utterances,
        words: result.words
      },
      message: `Created Speech Understanding results for transcript **${ctx.input.transcriptId}**.`
    };
  })
  .build();
