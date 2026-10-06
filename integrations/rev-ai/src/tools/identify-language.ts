import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let identifyLanguage = SlateTool.create(spec, {
  name: 'Identify Language',
  key: 'identify_language',
  description: `Submits audio for language identification and retrieves the results. Identifies the spoken language in audio input and returns confidence scores for each detected language.
Can submit a media URL for a new identification or poll an existing job for results.`,
  instructions: [
    'Provide either a mediaUrl for new identification or a jobId to retrieve results from an existing job.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaUrl: z
        .string()
        .url()
        .max(2048)
        .optional()
        .describe('Public URL of the audio file to identify the language of'),
      sourceAuthHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Optional headers required to download a new media URL'),
      jobId: z
        .string()
        .optional()
        .describe('Existing language identification job ID to retrieve results for'),
      metadata: z
        .string()
        .max(512)
        .optional()
        .describe('Optional metadata to associate with the job'),
      deleteAfterSeconds: z
        .number()
        .int()
        .min(0)
        .max(2592000)
        .optional()
        .describe('Auto-delete job after this many seconds')
    })
  )
  .output(
    z.object({
      jobId: z.string().min(1).describe('Language identification job ID'),
      status: z.string().describe('Job status: "in_progress", "completed", "failed"'),
      failure: z.string().optional().describe('Failure reason when processing failed'),
      failureDetail: z.string().optional().describe('Detailed failure information'),
      topLanguage: z.string().optional().describe('Most likely language code'),
      languageConfidences: z
        .array(
          z.object({
            language: z.string().describe('ISO 639-1 language code'),
            confidence: z.number().describe('Confidence score from 0 to 1')
          })
        )
        .optional()
        .describe('Confidence scores for each detected language (only when job is completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });

    if (ctx.input.jobId && ctx.input.mediaUrl) {
      throw createApiServiceError(
        'Provide mediaUrl for a new identification or jobId for an existing job, not both.'
      );
    }
    let jobId = ctx.input.jobId;

    if (!jobId && ctx.input.mediaUrl) {
      let job = await client.submitLanguageIdentification({
        sourceConfig: { url: ctx.input.mediaUrl, authHeaders: ctx.input.sourceAuthHeaders },
        metadata: ctx.input.metadata,
        deleteAfterSeconds: ctx.input.deleteAfterSeconds
      });
      jobId = job.jobId;
    }

    if (!jobId) {
      throw createApiServiceError('Either mediaUrl or jobId must be provided');
    }

    let job = await client.getLanguageIdentificationJob(jobId);

    let topLanguage: string | undefined;
    let languageConfidences: Array<{ language: string; confidence: number }> | undefined;

    if (job.status === 'completed') {
      let result = await client.getLanguageIdentificationResult(jobId);
      topLanguage = result.topLanguage;
      languageConfidences = result.languageConfidences;
    }

    return {
      output: {
        jobId,
        status: job.status,
        failure: job.failure,
        failureDetail: job.failureDetail,
        topLanguage,
        languageConfidences
      },
      message:
        job.status === 'completed' && topLanguage
          ? `Language identified: **${topLanguage}**${languageConfidences?.length ? ` (confidence: ${languageConfidences.find(lc => lc.language === topLanguage)?.confidence ?? 'N/A'})` : ''}`
          : `Language identification job **${jobId}** is **${job.status}**.`
    };
  })
  .build();
