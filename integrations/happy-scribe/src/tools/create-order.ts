import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Transcription Order',
  key: 'create_order',
  description: `Create a new transcription or subtitling order for an audio/video file. Supports both AI-powered automatic transcription and human professional transcription in 120+ languages. You can attach glossaries and style guides to improve accuracy, organize with tags and folders, and optionally receive webhook notifications on order state changes.`,
  instructions: [
    'The media URL must be publicly accessible or an S3 URL obtained from the upload tool.',
    'Set confirm to true to immediately submit the order, or leave it false to create a draft that can be confirmed later.',
    'Professional (pro) orders take longer but are higher quality than automatic (auto) orders.'
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
        .describe(
          'Publicly accessible URL to the audio/video file, or an S3 URL from Happy Scribe uploads.'
        ),
      language: z
        .string()
        .describe('BCP-47 language code for the source audio (e.g. "en", "fr", "de").'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID. Falls back to the value in config if not provided.'),
      service: z
        .enum(['auto', 'pro'])
        .optional()
        .describe(
          'Transcription service type. "auto" for AI-powered, "pro" for human professional.'
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to immediately submit the order. Defaults to false (draft/incomplete state).'
        ),
      name: z.string().optional().describe('Custom name for the transcription.'),
      isSubtitle: z
        .boolean()
        .optional()
        .describe('Set to true to create subtitles instead of a plain transcription.'),
      boost: z
        .boolean()
        .optional()
        .describe('Set to true to expedite professional orders for faster turnaround.'),
      folderId: z
        .string()
        .optional()
        .describe('ID of the folder to place the transcription in.'),
      folder: z
        .string()
        .optional()
        .describe('Folder path to place the transcription in (alternative to folderId).'),
      tags: z.array(z.string()).optional().describe('Tags to organize the transcription.'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook notifications when the order state changes.'),
      glossaryIds: z
        .array(z.string())
        .optional()
        .describe('IDs of glossaries to attach for domain-specific terminology.'),
      styleGuideId: z
        .string()
        .optional()
        .describe('ID of a style guide to apply formatting preferences.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the created order.'),
      state: z.string().describe('Current state of the order.'),
      operations: z.any().optional().describe('Operations associated with the order.'),
      transcriptions: z.any().optional().describe('Transcriptions associated with the order.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) {
      throw new Error(
        'Organization ID is required. Provide it in the input or configure it globally.'
      );
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.createOrder({
      url: ctx.input.mediaUrl,
      language: ctx.input.language,
      organizationId: orgId,
      service: ctx.input.service,
      confirm: ctx.input.confirm,
      name: ctx.input.name,
      isSubtitle: ctx.input.isSubtitle,
      boost: ctx.input.boost,
      folderId: ctx.input.folderId,
      folder: ctx.input.folder,
      tags: ctx.input.tags,
      webhookUrl: ctx.input.webhookUrl,
      glossaryIds: ctx.input.glossaryIds,
      styleGuideId: ctx.input.styleGuideId
    });

    return {
      output: {
        orderId: result.id,
        state: result.state,
        operations: result.operations,
        transcriptions: result.transcriptions
      },
      message: `Created transcription order **${result.id}** in state **${result.state}**${ctx.input.confirm ? ' (confirmed)' : ' (draft - needs confirmation)'}.`
    };
  })
  .build();
