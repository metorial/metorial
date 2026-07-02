import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';
import {
  languageIdSettingsSchema,
  tagSchema,
  validateLanguageIdSettings,
  validateVocabularyFilterMethod
} from './common';

export let startCallAnalyticsJob = SlateTool.create(spec, {
  name: 'Start Call Analytics Job',
  key: 'start_call_analytics_job',
  description: `Start a Call Analytics transcription job that processes call center audio to extract insights like sentiment, call categories, characteristics, and AI-powered summaries. Designed for two-channel audio where agent and customer are on separate channels. Can also redact PII from both transcripts and source audio.`,
  instructions: [
    'Channel definitions map audio channels to participant roles (AGENT or CUSTOMER).',
    'Enable summarization to get an AI-generated call summary.'
  ],
  constraints: [
    'Requires two-channel audio with agent and customer on separate channels.',
    'Job names must be unique within an AWS account.'
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
        .describe('Unique name for the call analytics job (1-200 chars, no spaces)'),
      mediaFileUri: z.string().describe('S3 URI of the call audio file'),
      redactedMediaFileUri: z
        .string()
        .optional()
        .describe(
          'S3 URI where AWS should write redacted source audio when using PII redaction'
        ),
      dataAccessRoleArn: z
        .string()
        .optional()
        .describe('IAM role ARN for accessing S3 and output resources'),
      outputLocation: z.string().optional().describe('S3 URI for the output location'),
      outputEncryptionKmsKeyId: z
        .string()
        .optional()
        .describe('KMS key ID for encrypting the output'),
      channelDefinitions: z
        .array(
          z.object({
            channelId: z.number().describe('Channel number (0 or 1)'),
            participantRole: z
              .enum(['AGENT', 'CUSTOMER'])
              .describe('Role of the participant on this channel')
          })
        )
        .optional()
        .describe('Mapping of audio channels to participant roles'),
      settings: z
        .object({
          vocabularyName: z.string().optional().describe('Custom vocabulary name'),
          vocabularyFilterName: z.string().optional().describe('Vocabulary filter name'),
          vocabularyFilterMethod: z
            .enum(['remove', 'mask', 'tag'])
            .optional()
            .describe('How to handle filtered words'),
          languageModelName: z.string().optional().describe('Custom language model name'),
          languageOptions: z
            .array(z.string())
            .optional()
            .describe('Expected language codes for auto-identification'),
          languageIdSettings: languageIdSettingsSchema,
          summarization: z.boolean().optional().describe('Enable AI-generated call summary'),
          contentRedaction: z
            .object({
              redactionType: z.enum(['PII']).describe('Type of content to redact'),
              redactionOutput: z
                .enum(['redacted', 'redacted_and_unredacted'])
                .describe('Redaction output mode'),
              piiEntityTypes: z
                .array(z.string())
                .optional()
                .describe('Specific PII entity types to redact')
            })
            .optional()
            .describe('PII content redaction settings')
        })
        .optional()
        .describe('Call analytics settings'),
      tags: z.array(tagSchema).optional().describe('Tags to associate with the job')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the call analytics job'),
      jobStatus: z
        .string()
        .describe('Current status (QUEUED, IN_PROGRESS, COMPLETED, FAILED)'),
      languageCode: z.string().optional().describe('Language code of the transcription'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file'),
      creationTime: z.number().optional().describe('Unix timestamp when the job was created')
    })
  )
  .handleInvocation(async ctx => {
    validateLanguageIdSettings(
      ctx.input.settings?.languageIdSettings,
      ctx.input.settings?.languageOptions
    );
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

    let result = await client.startCallAnalyticsJob(ctx.input);
    let job = result.CallAnalyticsJob;

    return {
      output: {
        jobName: job.CallAnalyticsJobName,
        jobStatus: job.CallAnalyticsJobStatus,
        languageCode: job.LanguageCode,
        mediaFileUri: job.Media?.MediaFileUri,
        creationTime: job.CreationTime
      },
      message: `Started call analytics job **${job.CallAnalyticsJobName}** with status **${job.CallAnalyticsJobStatus}**.`
    };
  });
