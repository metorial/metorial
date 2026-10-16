import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let campaignInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  campaignId: z.string().describe('ID of the campaign whose video transcript to read')
});

let transcriptStatusSchema = z
  .object({
    campaignId: z.string().optional(),
    status: z.enum(['none', 'processing', 'ready', 'failed']).optional(),
    language: z.string().nullable().optional(),
    source: z.enum(['master', 'prospect']).nullable().optional(),
    generatedAt: z.string().nullable().optional()
  })
  .passthrough();

export let getTranscriptStatus = SlateTool.create(spec, {
  name: 'Get Transcript Status',
  key: 'get_transcript_status',
  description:
    'Check whether a campaign video transcript is ready. This read-only operation never starts transcription and is safe to poll.',
  tags: { readOnly: true }
})
  .input(campaignInputSchema)
  .output(z.object({ transcriptStatus: transcriptStatusSchema }))
  .handleInvocation(async ctx => {
    let transcriptStatus = await createClient(ctx).getTranscriptStatus(ctx.input.campaignId);
    return {
      output: { transcriptStatus },
      message: 'Retrieved the campaign transcript status.'
    };
  })
  .build();

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Campaign Transcript',
  key: 'get_transcript',
  description:
    'Read a ready campaign video transcript as text and timed segments. Reading never starts transcription. Use get_transcript_status to check readiness; an unavailable transcript returns 404.',
  tags: { readOnly: true }
})
  .input(campaignInputSchema)
  .output(
    z.object({
      transcript: z
        .object({
          campaignId: z.string().optional(),
          language: z.string().optional(),
          source: z.enum(['master', 'prospect']).optional(),
          generatedAt: z.string().nullable().optional(),
          text: z.string().optional(),
          segments: z
            .array(
              z
                .object({
                  speaker: z.string().nullable().optional(),
                  start: z.number().optional(),
                  end: z.number().optional(),
                  text: z.string().optional()
                })
                .passthrough()
            )
            .optional()
        })
        .passthrough()
    })
  )
  .handleInvocation(async ctx => {
    let transcript = await createClient(ctx).getTranscript(ctx.input.campaignId);
    return { output: { transcript }, message: 'Retrieved the campaign transcript.' };
  })
  .build();

export let downloadTranscript = SlateTool.create(spec, {
  name: 'Download Campaign Subtitles',
  key: 'download_transcript',
  description:
    'Download a ready campaign video transcript as WebVTT or SubRip subtitles. This does not generate or regenerate a transcript.',
  tags: { readOnly: true }
})
  .input(
    campaignInputSchema.extend({
      format: z.enum(['vtt', 'srt']).describe('Subtitle file format')
    })
  )
  .output(
    z.object({
      requestedCampaignId: z.string(),
      format: z.enum(['vtt', 'srt']),
      mimeType: z.string(),
      transcriptStatus: transcriptStatusSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let transcriptStatus = await client.getTranscriptStatus(ctx.input.campaignId);
    if (transcriptStatus.status !== 'ready') {
      throw createApiServiceError(
        'The campaign transcript is not ready. Use get_transcript_status to check its state.'
      );
    }
    let mimeType = ctx.input.format === 'vtt' ? 'text/vtt' : 'application/x-subrip';
    await ctx.addAttachment({
      type: 'url',
      url: await client.transcriptDownloadUrl(ctx.input.campaignId),
      headers: {
        'x-api-key': ctx.auth.apiKey,
        'x-api-secret': ctx.auth.apiSecret
      },
      query: { format: ctx.input.format },
      mimeType
    });
    return {
      output: {
        requestedCampaignId: ctx.input.campaignId,
        format: ctx.input.format,
        mimeType,
        transcriptStatus
      },
      message: `Prepared the ${ctx.input.format.toUpperCase()} subtitle download.`
    };
  })
  .build();
