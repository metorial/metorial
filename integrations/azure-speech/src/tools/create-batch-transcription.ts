import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let createBatchTranscription = SlateTool.create(spec, {
  name: 'Create Batch Transcription',
  key: 'create_batch_transcription',
  description: `Submits a batch transcription job to process one or more audio files asynchronously.
Ideal for transcribing large volumes of prerecorded audio. Provide audio file URLs or an Azure Blob Storage container URL.
The job runs asynchronously — use the **Get Batch Transcription** tool to check status and retrieve results.`,
  instructions: [
    'Provide either contentUrls (list of audio file URLs) or contentContainerUrl (Azure Blob container URL), not both.',
    'Set timeToLiveHours to control how long results are retained (minimum 6 hours, maximum 31 days, default 48 hours).',
    'Enable diarization to identify different speakers in multi-speaker audio.'
  ],
  constraints: [
    'Diarization supports up to 35 speakers and requires mono audio no longer than 240 minutes per file.',
    'Transcription completion time depends on audio size and service load.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      displayName: z.string().describe('A descriptive name for the transcription job'),
      locale: z.string().describe('Expected locale of the audio (e.g., "en-US", "de-DE")'),
      contentUrls: z
        .array(z.string())
        .optional()
        .describe(
          'List of audio file URLs to transcribe. Mutually exclusive with contentContainerUrl.'
        ),
      contentContainerUrl: z
        .string()
        .optional()
        .describe(
          'Azure Blob Storage container URL containing audio files. Mutually exclusive with contentUrls.'
        ),
      timeToLiveHours: z
        .number()
        .optional()
        .describe('Hours to retain results after completion (6-744, default 48)'),
      wordLevelTimestampsEnabled: z
        .boolean()
        .optional()
        .describe('Include word-level timestamps in results'),
      diarizationEnabled: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization for 2 speakers'),
      diarizationMinSpeakers: z
        .number()
        .optional()
        .describe('Minimum number of speakers for diarization (for 3+ speakers)'),
      diarizationMaxSpeakers: z
        .number()
        .optional()
        .describe('Maximum number of speakers for diarization (max 36)'),
      punctuationMode: z
        .enum(['None', 'Dictated', 'Automatic', 'DictatedAndAutomatic'])
        .optional()
        .describe('Punctuation handling mode'),
      profanityFilterMode: z
        .enum(['None', 'Masked', 'Removed', 'Tags'])
        .optional()
        .describe('Profanity filter mode'),
      modelUri: z
        .string()
        .optional()
        .describe(
          'Full URI of a custom or Whisper model to use instead of the default base model'
        ),
      languageIdentificationLocales: z
        .array(z.string())
        .optional()
        .describe('Candidate locales for language identification (2-10 locales)')
    })
  )
  .output(
    z.object({
      transcriptionId: z
        .string()
        .describe('Unique identifier of the created transcription job'),
      selfUri: z.string().describe('Full URI of the transcription resource'),
      status: z.string().describe('Current status of the transcription (e.g., "NotStarted")'),
      displayName: z.string().describe('Display name of the transcription'),
      locale: z.string().describe('Locale of the transcription'),
      createdAt: z.string().describe('ISO 8601 timestamp when the transcription was created')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;

    if (!input.contentUrls && !input.contentContainerUrl) {
      throw new Error('Either contentUrls or contentContainerUrl must be provided.');
    }

    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let diarization =
      input.diarizationMinSpeakers || input.diarizationMaxSpeakers
        ? {
            minCount: input.diarizationMinSpeakers,
            maxCount: input.diarizationMaxSpeakers
          }
        : undefined;

    let languageIdentification = input.languageIdentificationLocales
      ? {
          candidateLocales: input.languageIdentificationLocales,
          mode: 'Continuous' as const
        }
      : undefined;

    ctx.info('Creating batch transcription job...');

    let result = await client.createBatchTranscription({
      displayName: input.displayName,
      locale: input.locale,
      contentUrls: input.contentUrls,
      contentContainerUrl: input.contentContainerUrl,
      timeToLiveHours: input.timeToLiveHours,
      wordLevelTimestampsEnabled: input.wordLevelTimestampsEnabled,
      diarizationEnabled: input.diarizationEnabled,
      diarization,
      punctuationMode: input.punctuationMode,
      profanityFilterMode: input.profanityFilterMode,
      model: input.modelUri,
      languageIdentification
    });

    let selfUri = result.self as string;
    let transcriptionId = selfUri.split('/transcriptions/')[1]?.split('?')[0] || selfUri;

    return {
      output: {
        transcriptionId,
        selfUri,
        status: result.status,
        displayName: result.displayName,
        locale: result.locale,
        createdAt: result.createdDateTime
      },
      message: `Batch transcription **"${result.displayName}"** created successfully. Status: **${result.status}**. Transcription ID: \`${transcriptionId}\`.`
    };
  })
  .build();
