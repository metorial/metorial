import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when a Rev AI job completes processing. Set the webhook URL as the notification_config.url when submitting any job (transcription, sentiment analysis, topic extraction, language identification, or custom vocabulary).'
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the completed job'),
      jobStatus: z.string().describe('Job status: "transcribed", "completed", or "failed"'),
      jobType: z.string().optional().describe('Type of job that completed'),
      failure: z.string().optional().describe('Failure reason if the job failed'),
      failureDetail: z.string().optional().describe('Detailed failure information'),
      createdOn: z.string().optional().describe('ISO 8601 job creation timestamp'),
      completedOn: z.string().optional().describe('ISO 8601 job completion timestamp'),
      mediaUrl: z.string().optional().describe('Media URL of the job'),
      metadata: z.string().optional().describe('Metadata associated with the job'),
      language: z.string().optional().describe('Language used for the job'),
      durationSeconds: z.number().optional().describe('Duration of the media in seconds')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the completed job'),
      jobStatus: z.string().describe('Job status'),
      jobType: z.string().optional().describe('Type of job'),
      failure: z.string().optional().describe('Failure reason'),
      failureDetail: z.string().optional().describe('Detailed failure information'),
      createdOn: z.string().optional().describe('ISO 8601 job creation timestamp'),
      completedOn: z.string().optional().describe('ISO 8601 job completion timestamp'),
      mediaUrl: z.string().optional().describe('Media URL of the job'),
      metadata: z.string().optional().describe('Metadata associated with the job'),
      language: z.string().optional().describe('Language used for the job'),
      durationSeconds: z.number().optional().describe('Duration of the media in seconds')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let job = body.job as Record<string, unknown> | undefined;

      let jobId = (job?.id ?? body.id ?? body.job_id) as string;
      let jobStatus = (job?.status ?? body.status) as string;
      let jobType = (job?.type ?? body.type) as string | undefined;
      let failure = (job?.failure ?? body.failure) as string | undefined;
      let failureDetail = (job?.failure_detail ?? body.failure_detail) as string | undefined;
      let createdOn = (job?.created_on ?? body.created_on) as string | undefined;
      let completedOn = (job?.completed_on ?? body.completed_on) as string | undefined;
      let mediaUrl = (job?.media_url ?? body.media_url) as string | undefined;
      let metadata = (job?.metadata ?? body.metadata) as string | undefined;
      let language = (job?.language ?? body.language) as string | undefined;
      let durationSeconds = (job?.duration_seconds ?? body.duration_seconds) as
        | number
        | undefined;

      return {
        inputs: [
          {
            jobId,
            jobStatus,
            jobType,
            failure,
            failureDetail,
            createdOn,
            completedOn,
            mediaUrl,
            metadata,
            language,
            durationSeconds
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.jobStatus === 'failed' ? 'job.failed' : 'job.completed';

      return {
        type: eventType,
        id: ctx.input.jobId,
        output: {
          jobId: ctx.input.jobId,
          jobStatus: ctx.input.jobStatus,
          jobType: ctx.input.jobType,
          failure: ctx.input.failure,
          failureDetail: ctx.input.failureDetail,
          createdOn: ctx.input.createdOn,
          completedOn: ctx.input.completedOn,
          mediaUrl: ctx.input.mediaUrl,
          metadata: ctx.input.metadata,
          language: ctx.input.language,
          durationSeconds: ctx.input.durationSeconds
        }
      };
    }
  })
  .build();
