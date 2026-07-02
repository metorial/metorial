import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let getTranscriptionJob = SlateTool.create(spec, {
  name: 'Get Transcription Job',
  key: 'get_transcription_job',
  description: `Retrieves the status and details of a transcription job by its ID. Use this to check whether a job has completed before fetching its transcript.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the transcription job to retrieve')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier for the transcription job'),
      status: z.string().describe('Job status: "in_progress", "transcribed", "failed"'),
      createdOn: z.string().describe('ISO 8601 timestamp when the job was created'),
      completedOn: z.string().optional().describe('ISO 8601 timestamp when the job completed'),
      language: z.string().optional().describe('Language of the transcription'),
      durationSeconds: z.number().optional().describe('Duration of the media in seconds'),
      mediaUrl: z.string().optional().describe('URL of the submitted media'),
      metadata: z.string().optional().describe('Metadata associated with the job'),
      failure: z.string().optional().describe('Failure reason if job failed'),
      failureDetail: z.string().optional().describe('Detailed failure information'),
      transcriber: z.string().optional().describe('Transcriber used for the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let job = await client.getTranscriptionJob(ctx.input.jobId);

    return {
      output: {
        jobId: job.jobId,
        status: job.status,
        createdOn: job.createdOn,
        completedOn: job.completedOn,
        language: job.language,
        durationSeconds: job.durationSeconds,
        mediaUrl: job.mediaUrl,
        metadata: job.metadata,
        failure: job.failure,
        failureDetail: job.failureDetail,
        transcriber: job.transcriber
      },
      message: `Transcription job **${job.jobId}** is **${job.status}**${job.durationSeconds ? ` (${job.durationSeconds}s duration)` : ''}.`
    };
  })
  .build();
