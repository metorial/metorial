import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let getMedicalTranscriptionJob = SlateTool.create(spec, {
  name: 'Get Medical Transcription Job',
  key: 'get_medical_transcription_job',
  description:
    'Retrieve status and details for a medical transcription job, including transcript URI, specialty, type, and failure details.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the medical transcription job to retrieve')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the medical transcription job'),
      jobStatus: z.string().describe('Current status of the job'),
      languageCode: z.string().optional().describe('Language code'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file'),
      transcriptFileUri: z.string().optional().describe('S3 URI of the transcript output'),
      mediaFormat: z.string().optional().describe('Format of the input media'),
      mediaSampleRateHertz: z.number().optional().describe('Sample rate of the input audio'),
      specialty: z.string().optional().describe('Medical specialty'),
      type: z.string().optional().describe('Medical transcription type'),
      creationTime: z.number().optional().describe('Unix timestamp when created'),
      startTime: z.number().optional().describe('Unix timestamp when started'),
      completionTime: z.number().optional().describe('Unix timestamp when completed'),
      failureReason: z.string().optional().describe('Failure reason, if any'),
      contentIdentificationType: z
        .string()
        .optional()
        .describe('Content identification type such as PHI')
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

    let result = await client.getMedicalTranscriptionJob(ctx.input.jobName);
    let job = result.MedicalTranscriptionJob;

    let statusMsg =
      job.TranscriptionJobStatus === 'COMPLETED'
        ? `completed. Transcript: ${job.Transcript?.TranscriptFileUri}`
        : job.TranscriptionJobStatus === 'FAILED'
          ? `failed: ${job.FailureReason}`
          : job.TranscriptionJobStatus;

    return {
      output: {
        jobName: job.MedicalTranscriptionJobName,
        jobStatus: job.TranscriptionJobStatus,
        languageCode: job.LanguageCode,
        mediaFileUri: job.Media?.MediaFileUri,
        transcriptFileUri: job.Transcript?.TranscriptFileUri,
        mediaFormat: job.MediaFormat,
        mediaSampleRateHertz: job.MediaSampleRateHertz,
        specialty: job.Specialty,
        type: job.Type,
        creationTime: job.CreationTime,
        startTime: job.StartTime,
        completionTime: job.CompletionTime,
        failureReason: job.FailureReason,
        contentIdentificationType: job.ContentIdentificationType
      },
      message: `Medical transcription job **${job.MedicalTranscriptionJobName}** is **${statusMsg}**.`
    };
  });
