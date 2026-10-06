import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let downloadCaptions = SlateTool.create(spec, {
  name: 'Download Captions',
  key: 'download_captions',
  description:
    'Downloads an SRT or VTT subtitle file for a completed transcription job. Supports translated captions when translation was requested during submission.',
  instructions: [
    'Wait for the transcription job to reach transcribed status before downloading captions.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      jobId: z.string().min(1).describe('ID of the completed transcription job'),
      format: z.enum(['srt', 'vtt']).describe('Subtitle file format'),
      speakerChannel: z
        .number()
        .int()
        .min(0)
        .max(7)
        .optional()
        .describe(
          'Zero-based speaker channel for multi-channel audio; omit for ordinary audio'
        ),
      translationLanguage: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Language code requested in translationTargetLanguages when the job was submitted'
        )
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      format: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      translationLanguage: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.translationLanguage && ctx.input.speakerChannel !== undefined) {
      throw createApiServiceError(
        'Translated captions do not support speakerChannel. Omit it or download the original captions.'
      );
    }
    let client = new RevAIClient({ token: ctx.auth.token });
    let job = await client.getTranscriptionJob(ctx.input.jobId);
    if (job.status !== 'transcribed') {
      throw createApiServiceError(
        `The job is ${job.status}. Wait for transcribed status before downloading captions.`
      );
    }
    if (ctx.input.translationLanguage) {
      let target = job.translation?.targetLanguages.find(
        item => item.language === ctx.input.translationLanguage
      );
      if (target?.status !== 'completed') {
        throw createApiServiceError(
          'The requested translation has not completed. Request that language during submission and wait for its translation status to become completed.'
        );
      }
    }
    let mimeType = ctx.input.format === 'srt' ? 'application/x-subrip' : 'text/vtt';
    let fileName = `captions-${ctx.input.jobId}${ctx.input.translationLanguage ? `-${ctx.input.translationLanguage}` : ''}.${ctx.input.format}`;
    let path = `/jobs/${encodeURIComponent(ctx.input.jobId)}/captions${ctx.input.translationLanguage ? `/translation/${encodeURIComponent(ctx.input.translationLanguage)}` : ''}`;
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.rev.ai/speechtotext/v1${path}`,
      headers: { Authorization: `Bearer ${ctx.auth.token}`, Accept: mimeType },
      query:
        ctx.input.speakerChannel !== undefined
          ? { speaker_channel: String(ctx.input.speakerChannel) }
          : undefined,
      mimeType,
      filename: fileName
    });
    return {
      output: {
        jobId: ctx.input.jobId,
        format: ctx.input.format,
        fileName,
        mimeType,
        translationLanguage: ctx.input.translationLanguage
      },
      message: `Prepared **${ctx.input.format.toUpperCase()}** captions for job **${ctx.input.jobId}** for download.`
    };
  })
  .build();
