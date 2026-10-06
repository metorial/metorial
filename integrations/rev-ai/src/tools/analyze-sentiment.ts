import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let analyzeSentiment = SlateTool.create(spec, {
  name: 'Analyze Sentiment',
  key: 'analyze_sentiment',
  description: `Submits text for sentiment analysis and retrieves the results. Analyzes the sentiment of each sentence in the provided transcript, returning scores in [-1, 1] range where below -0.3 is negative, above 0.3 is positive, and in between is neutral.
Can submit plain text directly or poll an existing job for results.`,
  instructions: [
    'Provide either text for a new analysis or a jobId to retrieve results from an existing job.',
    'When submitting new text, the job processes asynchronously. Use the returned jobId to poll for results.'
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
        .describe('Plain text transcript to analyze for sentiment'),
      jobId: z
        .string()
        .optional()
        .describe('Existing sentiment analysis job ID to retrieve results for'),
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
        .describe('Optional metadata to associate with the job')
    })
  )
  .output(
    z.object({
      jobId: z.string().min(1).describe('Sentiment analysis job ID'),
      status: z.string().describe('Job status: "in_progress", "completed", "failed"'),
      failure: z.string().optional().describe('Failure reason when processing failed'),
      failureDetail: z.string().optional().describe('Detailed failure information'),
      messages: z
        .array(
          z.object({
            content: z.string().describe('The analyzed sentence text'),
            score: z.number().describe('Sentiment score from -1 (negative) to 1 (positive)'),
            sentiment: z
              .string()
              .describe('Sentiment label: "positive", "negative", or "neutral"'),
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
        .optional()
        .describe('Sentence-level sentiment results (only when job is completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });

    if (ctx.input.jobId && ctx.input.text) {
      throw createApiServiceError(
        'Provide text for a new analysis or jobId for an existing job, not both.'
      );
    }
    let jobId = ctx.input.jobId;

    if (!jobId && ctx.input.text) {
      let job = await client.submitSentimentAnalysis({
        text: ctx.input.text,
        metadata: ctx.input.metadata,
        deleteAfterSeconds: ctx.input.deleteAfterSeconds
      });
      jobId = job.jobId;
    }

    if (!jobId) {
      throw createApiServiceError('Either text or jobId must be provided');
    }

    let job = await client.getSentimentAnalysisJob(jobId);

    let messages:
      | Array<{
          content: string;
          score: number;
          sentiment: string;
          offset?: number;
          length?: number;
          ts?: number;
          endTs?: number;
        }>
      | undefined;

    if (job.status === 'completed') {
      let result = await client.getSentimentAnalysisResult(jobId);
      messages = result.messages;
    }

    return {
      output: {
        jobId,
        status: job.status,
        failure: job.failure,
        failureDetail: job.failureDetail,
        messages
      },
      message:
        job.status === 'completed' && messages
          ? `Sentiment analysis completed with **${messages.length}** analyzed sentences.`
          : `Sentiment analysis job **${jobId}** is **${job.status}**.`
    };
  })
  .build();
