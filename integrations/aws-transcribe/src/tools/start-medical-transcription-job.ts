import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let startMedicalTranscriptionJob = SlateTool.create(spec, {
  name: 'Start Medical Transcription Job',
  key: 'start_medical_transcription_job',
  description: `Start a medical transcription job to convert medical speech to text. Incorporates medical terminology for use cases like transcribing doctor-patient dialogue, physician notes, and dictation. Supports speaker diarization and channel identification for multi-party conversations.`,
  instructions: [
    'Currently only en-US is supported for medical transcription.',
    'Specialty should be set to PRIMARYCARE.',
    'Type should be CONVERSATION for dialogue or DICTATION for single-speaker medical notes.'
  ],
  constraints: [
    'An output S3 bucket is required for medical transcription jobs.',
    'Only en-US language is supported.'
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
        .describe('Unique name for the medical transcription job (1-200 chars, no spaces)'),
      mediaFileUri: z.string().describe('S3 URI of the medical audio file'),
      languageCode: z
        .string()
        .default('en-US')
        .describe('Language code (currently only en-US supported)'),
      specialty: z.enum(['PRIMARYCARE']).default('PRIMARYCARE').describe('Medical specialty'),
      type: z
        .enum(['CONVERSATION', 'DICTATION'])
        .describe('CONVERSATION for dialogue, DICTATION for single-speaker notes'),
      outputBucketName: z.string().describe('S3 bucket name for the transcript output'),
      outputKey: z.string().optional().describe('S3 key prefix for transcript output'),
      outputEncryptionKmsKeyId: z
        .string()
        .optional()
        .describe('KMS key ID for encrypting the output'),
      mediaFormat: z
        .enum(['mp3', 'mp4', 'wav', 'flac', 'ogg', 'amr', 'webm'])
        .optional()
        .describe('Format of the media file'),
      mediaSampleRateHertz: z.number().optional().describe('Sample rate of the audio in Hz'),
      settings: z
        .object({
          showSpeakerLabels: z.boolean().optional().describe('Enable speaker diarization'),
          maxSpeakerLabels: z
            .number()
            .optional()
            .describe('Maximum number of speakers (2-10)'),
          channelIdentification: z
            .boolean()
            .optional()
            .describe('Enable multi-channel identification'),
          showAlternatives: z
            .boolean()
            .optional()
            .describe('Enable alternative transcriptions'),
          maxAlternatives: z
            .number()
            .optional()
            .describe('Maximum number of alternatives (2-10)'),
          vocabularyName: z.string().optional().describe('Custom medical vocabulary name')
        })
        .optional()
        .describe('Medical transcription settings'),
      contentIdentificationType: z
        .enum(['PHI'])
        .optional()
        .describe('Identify protected health information (PHI)'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Tags to associate with the job')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the medical transcription job'),
      jobStatus: z
        .string()
        .describe('Current status (QUEUED, IN_PROGRESS, COMPLETED, FAILED)'),
      languageCode: z.string().optional().describe('Language code'),
      specialty: z.string().optional().describe('Medical specialty'),
      type: z.string().optional().describe('Transcription type (CONVERSATION or DICTATION)'),
      creationTime: z.number().optional().describe('Unix timestamp when the job was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    let result = await client.startMedicalTranscriptionJob(ctx.input);
    let job = result.MedicalTranscriptionJob;

    return {
      output: {
        jobName: job.MedicalTranscriptionJobName,
        jobStatus: job.TranscriptionJobStatus,
        languageCode: job.LanguageCode,
        specialty: job.Specialty,
        type: job.Type,
        creationTime: job.CreationTime
      },
      message: `Started medical transcription job **${job.MedicalTranscriptionJobName}** with status **${job.TranscriptionJobStatus}**.`
    };
  });
