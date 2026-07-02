import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { azureSpeechServiceError } from '../lib/errors';
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
      destinationContainerUrl: z
        .string()
        .optional()
        .describe(
          'Optional Azure Blob Storage container URL where transcription result files should be written.'
        ),
      timeToLiveHours: z
        .number()
        .optional()
        .describe('Hours to retain results after completion (6-744, default 48)'),
      wordLevelTimestampsEnabled: z
        .boolean()
        .optional()
        .describe('Include word-level timestamps in results'),
      displayFormWordLevelTimestampsEnabled: z
        .boolean()
        .optional()
        .describe('Include word-level timestamps for the display-form transcript'),
      channels: z
        .array(z.number())
        .optional()
        .describe('Zero-based audio channels to transcribe separately, such as [0, 1]'),
      diarizationEnabled: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization for single-channel audio'),
      diarizationMaxSpeakers: z
        .number()
        .optional()
        .describe('Maximum expected speakers for diarization (2-35)'),
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
        .describe('Candidate locales for language identification (2-10 locales)'),
      languageIdentificationMode: z
        .enum(['Continuous', 'Single'])
        .optional()
        .describe('Language identification mode. Defaults to Continuous.')
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

    if (!input.contentUrls?.length && !input.contentContainerUrl) {
      throw azureSpeechServiceError(
        'Either contentUrls or contentContainerUrl must be provided.'
      );
    }

    if (input.contentUrls?.length && input.contentContainerUrl) {
      throw azureSpeechServiceError(
        'contentUrls and contentContainerUrl are mutually exclusive.'
      );
    }

    if (input.contentUrls && input.contentUrls.length > 1000) {
      throw azureSpeechServiceError('contentUrls can include at most 1000 audio URLs.');
    }

    if (
      input.timeToLiveHours !== undefined &&
      (input.timeToLiveHours < 6 || input.timeToLiveHours > 744)
    ) {
      throw azureSpeechServiceError('timeToLiveHours must be between 6 and 744.');
    }

    if (
      input.diarizationMaxSpeakers !== undefined &&
      (input.diarizationMaxSpeakers < 2 || input.diarizationMaxSpeakers > 35)
    ) {
      throw azureSpeechServiceError('diarizationMaxSpeakers must be between 2 and 35.');
    }

    if (
      input.languageIdentificationLocales &&
      (input.languageIdentificationLocales.length < 2 ||
        (input.languageIdentificationMode !== 'Single' &&
          input.languageIdentificationLocales.length > 10))
    ) {
      throw azureSpeechServiceError(
        'languageIdentificationLocales must include 2-10 locales unless languageIdentificationMode is "Single".'
      );
    }

    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let diarization =
      input.diarizationEnabled !== undefined || input.diarizationMaxSpeakers !== undefined
        ? {
            enabled: input.diarizationEnabled ?? true,
            maxSpeakers: input.diarizationMaxSpeakers
          }
        : undefined;

    let languageIdentification = input.languageIdentificationLocales
      ? {
          candidateLocales: input.languageIdentificationLocales,
          mode: input.languageIdentificationMode ?? 'Continuous'
        }
      : undefined;

    ctx.info('Creating batch transcription job...');

    let result = await client.createBatchTranscription({
      displayName: input.displayName,
      locale: input.locale,
      contentUrls: input.contentUrls,
      contentContainerUrl: input.contentContainerUrl,
      destinationContainerUrl: input.destinationContainerUrl,
      timeToLiveHours: input.timeToLiveHours,
      wordLevelTimestampsEnabled: input.wordLevelTimestampsEnabled,
      displayFormWordLevelTimestampsEnabled: input.displayFormWordLevelTimestampsEnabled,
      channels: input.channels,
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
