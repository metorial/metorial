import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let listTranscriptionJobs = SlateTool.create(spec, {
  name: 'List Transcription Jobs',
  key: 'list_transcription_jobs',
  description: `Lists transcription jobs submitted within the last 30 days in reverse chronological order. Supports pagination for retrieving large sets of jobs.`,
  constraints: [
    'Only jobs from the last 30 days are listed.',
    'Maximum 1000 jobs per request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum number of jobs to return (0-1000, default: 100)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Job ID to paginate after (returns jobs created before this job)')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().min(1).describe('Unique identifier for the job'),
            status: z.string().describe('Job status'),
            createdOn: z.string().describe('ISO 8601 creation timestamp'),
            completedOn: z.string().optional().describe('ISO 8601 completion timestamp'),
            language: z.string().optional().describe('Language of the transcription'),
            durationSeconds: z.number().optional().describe('Media duration in seconds'),
            metadata: z.string().max(512).optional().describe('Associated metadata'),
            transcriber: z.string().optional().describe('Transcriber used')
          })
        )
        .describe('List of transcription jobs'),
      nextStartingAfter: z
        .string()
        .optional()
        .describe(
          'Last job ID to pass as startingAfter for the next page; omitted when fewer than the requested limit are returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let jobs = await client.listTranscriptionJobs({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });

    return {
      output: {
        nextStartingAfter:
          jobs.length > 0 && jobs.length === (ctx.input.limit ?? 100)
            ? jobs.at(-1)?.jobId
            : undefined,
        jobs: jobs.map(j => ({
          jobId: j.jobId,
          status: j.status,
          createdOn: j.createdOn,
          completedOn: j.completedOn,
          language: j.language,
          durationSeconds: j.durationSeconds,
          metadata: j.metadata,
          transcriber: j.transcriber
        }))
      },
      message: `Found **${jobs.length}** transcription job(s).`
    };
  })
  .build();
