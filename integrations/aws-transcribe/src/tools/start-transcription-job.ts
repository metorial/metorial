import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { transcribeServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  ensureExactlyOne,
  kmsEncryptionContextSchema,
  languageIdSettingsSchema,
  mediaFormatSchema,
  tagSchema,
  validateLanguageIdSettings,
  validateVocabularyFilterMethod
} from './common';

export let startTranscriptionJob = SlateTool.create(spec, {
  name: 'Start Transcription Job',
  key: 'start_transcription_job',
  description: `Start a batch transcription job to convert speech from an audio or video file stored in Amazon S3 to text. Supports features like speaker diarization, channel identification, custom vocabularies, PII redaction, subtitle generation, and toxicity detection. The job runs asynchronously; use **Get Transcription Job** to check status and retrieve results.`,
  instructions: [
    'Provide either a languageCode or set identifyLanguage/identifyMultipleLanguages to true for automatic language detection.',
    'The mediaFileUri must be an S3 URI (e.g., s3://bucket-name/path/to/file.mp3).',
    'If no outputBucketName is provided, the transcript is stored in an AWS-managed S3 bucket and auto-deleted after 90 days.'
  ],
  constraints: [
    'Files are limited to 4 hours or 2 GB per job.',
    'Supported formats: FLAC, MP3, MP4, Ogg, WebM, AMR, WAV.',
    'Job names must be unique within an AWS account, are case-sensitive, and cannot contain spaces.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobName: z
        .string()
        .describe('Unique name for the transcription job (1-200 chars, no spaces)'),
      mediaFileUri: z
        .string()
        .describe('S3 URI of the media file to transcribe (e.g., s3://bucket/key.mp3)'),
      languageCode: z
        .string()
        .optional()
        .describe(
          'Language code of the audio (e.g., en-US, es-ES). Required if not using automatic language identification.'
        ),
      identifyLanguage: z
        .boolean()
        .optional()
        .describe('Enable automatic single-language identification'),
      identifyMultipleLanguages: z
        .boolean()
        .optional()
        .describe('Enable automatic multi-language identification'),
      languageIdSettings: languageIdSettingsSchema,
      languageOptions: z
        .array(z.string())
        .optional()
        .describe(
          'List of expected language codes to improve language identification accuracy'
        ),
      mediaFormat: mediaFormatSchema
        .optional()
        .describe('Format of the media file. Usually auto-detected from file extension.'),
      mediaSampleRateHertz: z
        .number()
        .optional()
        .describe('Sample rate of the audio in Hz (8000-48000)'),
      outputBucketName: z
        .string()
        .optional()
        .describe('S3 bucket for transcript output. If omitted, uses an AWS-managed bucket.'),
      outputKey: z
        .string()
        .optional()
        .describe('S3 key prefix for transcript output within the output bucket'),
      outputEncryptionKmsKeyId: z
        .string()
        .optional()
        .describe('KMS key ID for encrypting the output'),
      kmsEncryptionContext: kmsEncryptionContextSchema,
      settings: z
        .object({
          vocabularyName: z.string().optional().describe('Name of a custom vocabulary to use'),
          showSpeakerLabels: z.boolean().optional().describe('Enable speaker diarization'),
          maxSpeakerLabels: z
            .number()
            .optional()
            .describe('Maximum number of speakers to identify (2-10)'),
          channelIdentification: z
            .boolean()
            .optional()
            .describe('Enable multi-channel audio identification'),
          showAlternatives: z
            .boolean()
            .optional()
            .describe('Enable alternative transcriptions'),
          maxAlternatives: z
            .number()
            .optional()
            .describe('Maximum number of alternative transcriptions (2-10)'),
          vocabularyFilterName: z
            .string()
            .optional()
            .describe('Name of a vocabulary filter to apply'),
          vocabularyFilterMethod: z
            .enum(['remove', 'mask', 'tag'])
            .optional()
            .describe('How to handle filtered words')
        })
        .optional()
        .describe(
          'Transcription settings for speaker labels, channels, vocabularies, and alternatives'
        ),
      modelSettings: z
        .object({
          languageModelName: z
            .string()
            .optional()
            .describe('Name of a custom language model to use')
        })
        .optional()
        .describe('Custom language model settings'),
      contentRedaction: z
        .object({
          redactionType: z.enum(['PII']).describe('Type of content to redact'),
          redactionOutput: z
            .enum(['redacted', 'redacted_and_unredacted'])
            .describe(
              'Whether to output only redacted or both redacted and unredacted transcripts'
            ),
          piiEntityTypes: z
            .array(z.string())
            .optional()
            .describe('Specific PII entity types to redact (e.g., SSN, CREDIT_DEBIT_NUMBER)')
        })
        .optional()
        .describe('PII content redaction settings'),
      subtitles: z
        .object({
          formats: z
            .array(z.enum(['vtt', 'srt']))
            .optional()
            .describe('Subtitle file formats to generate'),
          outputStartIndex: z
            .number()
            .optional()
            .describe('Starting index for subtitle numbering (0 or 1)')
        })
        .optional()
        .describe('Subtitle generation settings'),
      toxicityDetection: z
        .array(z.enum(['ALL']))
        .optional()
        .describe('Toxicity categories to detect. AWS currently accepts ALL.'),
      jobExecutionSettings: z
        .object({
          allowDeferredExecution: z
            .boolean()
            .describe('Allow the job to be queued if concurrency limits are reached'),
          dataAccessRoleArn: z.string().describe('IAM role ARN for deferred execution')
        })
        .optional()
        .describe('Job execution settings for deferred execution'),
      tags: z.array(tagSchema).optional().describe('Tags to associate with the job')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the transcription job'),
      jobStatus: z
        .string()
        .describe('Current status of the job (QUEUED, IN_PROGRESS, COMPLETED, FAILED)'),
      languageCode: z.string().optional().describe('Language code of the transcription'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file'),
      creationTime: z.number().optional().describe('Unix timestamp when the job was created')
    })
  )
  .handleInvocation(async ctx => {
    ensureExactlyOne(
      [
        ['languageCode', typeof ctx.input.languageCode === 'string'],
        ['identifyLanguage', ctx.input.identifyLanguage === true],
        ['identifyMultipleLanguages', ctx.input.identifyMultipleLanguages === true]
      ],
      'Provide exactly one language selection: languageCode, identifyLanguage, or identifyMultipleLanguages.'
    );

    if (
      ctx.input.languageIdSettings &&
      !ctx.input.identifyLanguage &&
      !ctx.input.identifyMultipleLanguages
    ) {
      throw transcribeServiceError(
        'languageIdSettings can only be used with identifyLanguage or identifyMultipleLanguages.'
      );
    }

    validateLanguageIdSettings(ctx.input.languageIdSettings, ctx.input.languageOptions, {
      allowLanguageModel: ctx.input.identifyMultipleLanguages !== true
    });
    validateVocabularyFilterMethod(
      ctx.input.settings?.vocabularyFilterName,
      ctx.input.settings?.vocabularyFilterMethod
    );

    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    let result = await client.startTranscriptionJob(ctx.input);

    let job = result.TranscriptionJob;

    return {
      output: {
        jobName: job.TranscriptionJobName,
        jobStatus: job.TranscriptionJobStatus,
        languageCode: job.LanguageCode,
        mediaFileUri: job.Media?.MediaFileUri,
        creationTime: job.CreationTime
      },
      message: `Started transcription job **${job.TranscriptionJobName}** with status **${job.TranscriptionJobStatus}**.`
    };
  });
