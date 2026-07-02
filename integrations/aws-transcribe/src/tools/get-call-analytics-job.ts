import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let getCallAnalyticsJob = SlateTool.create(spec, {
  name: 'Get Call Analytics Job',
  key: 'get_call_analytics_job',
  description: `Retrieve the status and details of a Call Analytics job including transcript URIs, channel definitions, completion time, and failure reason. Use this to check if a call analytics job has completed and to get the results location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the call analytics job to retrieve')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the call analytics job'),
      jobStatus: z
        .string()
        .describe('Current status (QUEUED, IN_PROGRESS, COMPLETED, FAILED)'),
      languageCode: z.string().optional().describe('Language code'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file'),
      transcriptFileUri: z.string().optional().describe('S3 URI of the transcript output'),
      creationTime: z.number().optional().describe('Unix timestamp when the job was created'),
      startTime: z.number().optional().describe('Unix timestamp when processing started'),
      completionTime: z.number().optional().describe('Unix timestamp when the job completed'),
      failureReason: z.string().optional().describe('Reason for failure if status is FAILED')
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

    let result = await client.getCallAnalyticsJob(ctx.input.jobName);
    let job = result.CallAnalyticsJob;

    let statusMsg =
      job.CallAnalyticsJobStatus === 'COMPLETED'
        ? `completed. Transcript: ${job.Transcript?.TranscriptFileUri}`
        : job.CallAnalyticsJobStatus === 'FAILED'
          ? `failed: ${job.FailureReason}`
          : job.CallAnalyticsJobStatus;

    return {
      output: {
        jobName: job.CallAnalyticsJobName,
        jobStatus: job.CallAnalyticsJobStatus,
        languageCode: job.LanguageCode,
        mediaFileUri: job.Media?.MediaFileUri,
        transcriptFileUri: job.Transcript?.TranscriptFileUri,
        creationTime: job.CreationTime,
        startTime: job.StartTime,
        completionTime: job.CompletionTime,
        failureReason: job.FailureReason
      },
      message: `Call analytics job **${job.CallAnalyticsJobName}** is **${statusMsg}**.`
    };
  });
