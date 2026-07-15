import { createBase64Attachment, SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

let captionExtensionByMimeType: Record<string, string> = {
  'application/ttml+xml': 'ttml',
  'application/x-subrip': 'srt',
  'text/srt': 'srt',
  'text/vtt': 'vtt',
  'text/sbv': 'sbv',
  'text/x-sbv': 'sbv'
};

let captionFileExtension = (format: string | undefined, mimeType: string) =>
  format ?? captionExtensionByMimeType[mimeType.toLowerCase()] ?? 'txt';

export let downloadCaption = SlateTool.create(spec, {
  name: 'Download Caption',
  key: 'download_caption',
  description:
    'Download an editable caption track as a Slate attachment, optionally converting its format or translating its language.',
  instructions: [
    'The authenticated user must have permission to edit the video; public caption tracks cannot be downloaded through this owner-only API.',
    'Use list_captions on an owned video to discover caption track IDs.'
  ],
  tags: { readOnly: true }
})
  .scopes(youtubeActionScopes.downloadCaption)
  .input(
    z.object({
      captionId: z.string().min(1).describe('Caption track ID from list_captions'),
      format: z
        .enum(['sbv', 'scc', 'srt', 'ttml', 'vtt'])
        .optional()
        .describe('Requested output format; omit to preserve the original format'),
      language: z
        .string()
        .regex(/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i)
        .optional()
        .describe(
          'BCP-47 language tag (e.g. en, zh-Hans, pt-BR) for a machine-translated caption track'
        )
    })
  )
  .output(
    z.object({
      captionId: z.string().describe('Downloaded caption track ID'),
      format: z.string().optional().describe('Requested caption format'),
      language: z.string().optional().describe('Requested translation language'),
      fileName: z.string().describe('Suggested attachment file name'),
      mimeType: z.string().describe('Attachment MIME type returned by YouTube'),
      sizeBytes: z.number().describe('Downloaded caption byte length'),
      attachmentCount: z.number().describe('Number of returned Slate attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);
    let result = await client.downloadCaption({
      captionId: ctx.input.captionId,
      format: ctx.input.format,
      language: ctx.input.language
    });
    let extension = captionFileExtension(ctx.input.format, result.mimeType);
    let safeCaptionId = ctx.input.captionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100);
    let fileName = `youtube-caption-${safeCaptionId}.${extension}`;

    return {
      output: {
        captionId: ctx.input.captionId,
        format: ctx.input.format,
        language: ctx.input.language,
        fileName,
        mimeType: result.mimeType,
        sizeBytes: result.content.length,
        attachmentCount: 1
      },
      attachments: [
        createBase64Attachment(result.content.toString('base64'), result.mimeType)
      ],
      message: `Downloaded caption track \`${ctx.input.captionId}\` as an attachment.`
    };
  })
  .build();
