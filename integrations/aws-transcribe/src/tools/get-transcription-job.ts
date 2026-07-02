import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let getTranscriptionJob = SlateTool.create(spec, {
  name: 'Get Transcription Job',
  key: 'get_transcription_job',
  description: `Retrieve the status and details of a transcription job including its transcript output URI, language, settings, and completion time. Use this to check if a job has completed and to get the transcript location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the transcription job to retrieve')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the transcription job'),
      jobStatus: z
        .string()
        .describe('Current status (QUEUED, IN_PROGRESS, COMPLETED, FAILED)'),
      languageCode: z.string().optional().describe('Language code of the transcription'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file'),
      transcriptFileUri: z.string().optional().describe('S3 URI of the transcript output'),
      redactedTranscriptFileUri: z
        .string()
        .optional()
        .describe('S3 URI of the redacted transcript output'),
      mediaFormat: z.string().optional().describe('Format of the input media'),
      mediaSampleRateHertz: z.number().optional().describe('Sample rate of the input audio'),
      creationTime: z.number().optional().describe('Unix timestamp when the job was created'),
      startTime: z.number().optional().describe('Unix timestamp when processing started'),
      completionTime: z.number().optional().describe('Unix timestamp when the job completed'),
      failureReason: z.string().optional().describe('Reason for failure if status is FAILED'),
      identifiedLanguageScore: z
        .number()
        .optional()
        .describe('Confidence score for identified language'),
      subtitleFileUris: z
        .array(z.string())
        .optional()
        .describe('S3 URIs of generated subtitle files')
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

    let result = await client.getTranscriptionJob(ctx.input.jobName);
    let job = result.TranscriptionJob;

    let output = {
      jobName: job.TranscriptionJobName,
      jobStatus: job.TranscriptionJobStatus,
      languageCode: job.LanguageCode,
      mediaFileUri: job.Media?.MediaFileUri,
      transcriptFileUri: job.Transcript?.TranscriptFileUri,
      redactedTranscriptFileUri: job.Transcript?.RedactedTranscriptFileUri,
      mediaFormat: job.MediaFormat,
      mediaSampleRateHertz: job.MediaSampleRateHertz,
      creationTime: job.CreationTime,
      startTime: job.StartTime,
      completionTime: job.CompletionTime,
      failureReason: job.FailureReason,
      identifiedLanguageScore: job.IdentifiedLanguageScore,
      subtitleFileUris: job.Subtitles?.SubtitleFileUris
    };

    let statusMsg =
      job.TranscriptionJobStatus === 'COMPLETED'
        ? `completed. Transcript available at: ${job.Transcript?.TranscriptFileUri}`
        : job.TranscriptionJobStatus === 'FAILED'
          ? `failed: ${job.FailureReason}`
          : job.TranscriptionJobStatus;

    return {
      output,
      message: `Transcription job **${job.TranscriptionJobName}** is **${statusMsg}**.`
    };
  });
