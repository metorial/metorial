import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let extractTopics = SlateTool.create(spec, {
  name: 'Extract Topics',
  key: 'extract_topics',
  description: `Submits text for topic extraction and retrieves the results. Identifies important keywords and concepts from a transcript, returning a ranked list of topics with relevance scores and supporting content fragments.
Can submit plain text directly or poll an existing job for results.`,
  instructions: [
    'Provide either text for a new extraction or a jobId to retrieve results from an existing job.',
    'Use scoreThreshold to filter out low-relevance topics from results.'
  ],
  constraints: [
    'Currently only supports English language input.',
    'Input longer than 14,000 words will fail.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z
        .string()
        .min(1)
        .optional()
        .describe('Plain text transcript to extract topics from'),
      jobId: z
        .string()
        .optional()
        .describe('Existing topic extraction job ID to retrieve results for'),
      deleteAfterSeconds: z
        .number()
        .int()
        .min(0)
        .max(2592000)
        .optional()
        .describe('Auto-delete a new job this many seconds after completion'),
      metadata: z
        .string()
        .max(512)
        .optional()
        .describe('Optional metadata to associate with the job'),
      scoreThreshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Minimum relevance score (0-1) to include in results')
    })
  )
  .output(
    z.object({
      jobId: z.string().min(1).describe('Topic extraction job ID'),
      status: z.string().describe('Job status: "in_progress", "completed", "failed"'),
      failure: z.string().optional().describe('Failure reason when processing failed'),
      failureDetail: z.string().optional().describe('Detailed failure information'),
      topics: z
        .array(
          z.object({
            topicName: z.string().describe('Extracted topic name'),
            score: z.number().describe('Relevance score (higher = more relevant)'),
            informants: z
              .array(
                z.object({
                  content: z.string().describe('Related content fragment'),
                  offset: z
                    .number()
                    .optional()
                    .describe('Character offset in plain-text input, excluding newlines'),
                  length: z
                    .number()
                    .optional()
                    .describe('Character length in plain-text input, excluding newlines'),
                  ts: z.number().optional().describe('Start timestamp in seconds'),
                  endTs: z.number().optional().describe('End timestamp in seconds')
                })
              )
              .describe('Content fragments related to this topic')
          })
        )
        .optional()
        .describe('Extracted topics ranked by relevance (only when job is completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });

    if (ctx.input.jobId && ctx.input.text) {
      throw createApiServiceError(
        'Provide text for a new extraction or jobId for an existing job, not both.'
      );
    }
    let jobId = ctx.input.jobId;

    if (!jobId && ctx.input.text) {
      let job = await client.submitTopicExtraction({
        text: ctx.input.text,
        metadata: ctx.input.metadata,
        deleteAfterSeconds: ctx.input.deleteAfterSeconds
      });
      jobId = job.jobId;
    }

    if (!jobId) {
      throw createApiServiceError('Either text or jobId must be provided');
    }

    let job = await client.getTopicExtractionJob(jobId);

    let topics:
      | Array<{
          topicName: string;
          score: number;
          informants: Array<{
            content: string;
            offset?: number;
            length?: number;
            ts?: number;
            endTs?: number;
          }>;
        }>
      | undefined;

    if (job.status === 'completed') {
      let result = await client.getTopicExtractionResult(jobId, ctx.input.scoreThreshold);
      topics = result.topics;
    }

    return {
      output: {
        jobId,
        status: job.status,
        failure: job.failure,
        failureDetail: job.failureDetail,
        topics
      },
      message:
        job.status === 'completed' && topics
          ? `Topic extraction completed with **${topics.length}** topic(s) found.${topics[0] ? ` Top topic: **${topics[0].topicName}** (score: ${topics[0].score})` : ''}`
          : `Topic extraction job **${jobId}** is **${job.status}**.`
    };
  })
  .build();
