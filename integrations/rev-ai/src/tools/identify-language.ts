import { SlateTool } from 'slates';
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
        .optional()
        .describe('Public URL of the audio file to identify the language of'),
      jobId: z
        .string()
        .optional()
        .describe('Existing language identification job ID to retrieve results for'),
      metadata: z.string().optional().describe('Optional metadata to associate with the job'),
      deleteAfterSeconds: z
        .number()
        .optional()
        .describe('Auto-delete job after this many seconds')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Language identification job ID'),
      status: z.string().describe('Job status: "in_progress", "completed", "failed"'),
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

    let jobId = ctx.input.jobId;

    if (!jobId && ctx.input.mediaUrl) {
      let job = await client.submitLanguageIdentification({
        mediaUrl: ctx.input.mediaUrl,
        metadata: ctx.input.metadata,
        deleteAfterSeconds: ctx.input.deleteAfterSeconds
      });
      jobId = job.jobId;
    }

    if (!jobId) {
      throw new Error('Either mediaUrl or jobId must be provided');
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
