import { SlateTool } from 'slates';
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
      text: z.string().optional().describe('Plain text transcript to analyze for sentiment'),
      jobId: z
        .string()
        .optional()
        .describe('Existing sentiment analysis job ID to retrieve results for'),
      metadata: z.string().optional().describe('Optional metadata to associate with the job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Sentiment analysis job ID'),
      status: z.string().describe('Job status: "in_progress", "completed", "failed"'),
      messages: z
        .array(
          z.object({
            content: z.string().describe('The analyzed sentence text'),
            score: z.number().describe('Sentiment score from -1 (negative) to 1 (positive)'),
            sentiment: z
              .string()
              .describe('Sentiment label: "positive", "negative", or "neutral"'),
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

    let jobId = ctx.input.jobId;

    if (!jobId && ctx.input.text) {
      let job = await client.submitSentimentAnalysis({
        text: ctx.input.text,
        metadata: ctx.input.metadata
      });
      jobId = job.jobId;
    }

    if (!jobId) {
      throw new Error('Either text or jobId must be provided');
    }

    let job = await client.getSentimentAnalysisJob(jobId);

    let messages:
      | Array<{
          content: string;
          score: number;
          sentiment: string;
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
        messages
      },
      message:
        job.status === 'completed' && messages
          ? `Sentiment analysis completed with **${messages.length}** analyzed sentences.`
          : `Sentiment analysis job **${jobId}** is **${job.status}**.`
    };
  })
  .build();
