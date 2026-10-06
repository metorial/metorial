import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description:
    'Lists recent transcription, sentiment analysis, topic extraction, or language identification jobs. Use the returned IDs to retrieve results or delete completed jobs.',
  constraints: ['Only jobs submitted in the last 30 days are listed.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      jobType: z
        .enum([
          'transcription',
          'sentiment_analysis',
          'topic_extraction',
          'language_identification'
        ])
        .describe('API whose jobs to list'),
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum number of jobs (0-1000, default 100)'),
      startingAfter: z
        .string()
        .min(1)
        .optional()
        .describe('Last job ID from the previous page; returns older jobs, excluding this ID')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          jobId: z.string(),
          status: z.string(),
          createdOn: z.string(),
          completedOn: z.string().optional(),
          metadata: z.string().optional(),
          language: z.string().optional(),
          failure: z.string().optional(),
          failureDetail: z.string().optional()
        })
      ),
      jobType: z.string(),
      nextStartingAfter: z
        .string()
        .optional()
        .describe(
          'Last job ID for the next page; omitted when fewer than the requested limit are returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let params = { limit: ctx.input.limit, startingAfter: ctx.input.startingAfter };
    let jobs = await {
      transcription: () => client.listTranscriptionJobs(params),
      sentiment_analysis: () => client.listSentimentAnalysisJobs(params),
      topic_extraction: () => client.listTopicExtractionJobs(params),
      language_identification: () => client.listLanguageIdentificationJobs(params)
    }[ctx.input.jobType]();
    return {
      output: {
        jobType: ctx.input.jobType,
        jobs: jobs.map(job => ({
          jobId: job.jobId,
          status: job.status,
          createdOn: job.createdOn,
          completedOn: job.completedOn,
          metadata: job.metadata,
          language: job.language,
          failure: job.failure,
          failureDetail: job.failureDetail
        })),
        nextStartingAfter:
          jobs.length > 0 && jobs.length === (ctx.input.limit ?? 100)
            ? jobs.at(-1)?.jobId
            : undefined
      },
      message: `Found **${jobs.length}** ${ctx.input.jobType} job(s).`
    };
  })
  .build();
