import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let getSlideThumbnail = SlateTool.create(spec, {
  name: 'Get Slide Thumbnail',
  key: 'get_slide_thumbnail',
  description:
    'Generates a PNG thumbnail of the latest version of a Google Slides page and returns the image bytes as a Slate attachment.',
  instructions: [
    'Use get_presentation to discover the pageObjectId for a slide.',
    'SMALL targets a 200 px width, MEDIUM 800 px, and LARGE 1600 px; portrait pages may be narrower.',
    'Google creates a requester-tagged content URL with a default 30-minute lifetime. This tool downloads it immediately and does not expose the temporary URL.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleSlidesActionScopes.getSlideThumbnail)
  .input(
    z.object({
      presentationId: z.string().min(1).describe('ID of the presentation'),
      pageObjectId: z
        .string()
        .min(1)
        .describe('Object ID of the slide page whose thumbnail to generate'),
      thumbnailSize: z
        .enum(['SMALL', 'MEDIUM', 'LARGE'])
        .optional()
        .describe(
          'Requested thumbnail width preset; omit to let Google choose its default size'
        )
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      pageObjectId: z.string().describe('Object ID of the rendered slide page'),
      thumbnailSize: z
        .enum(['SMALL', 'MEDIUM', 'LARGE'])
        .optional()
        .describe('Requested thumbnail size preset, when provided'),
      widthPixels: z.number().int().positive().describe('Rendered image width in pixels'),
      heightPixels: z.number().int().positive().describe('Rendered image height in pixels'),
      mimeType: z.literal('image/png').describe('Attachment MIME type'),
      sizeBytes: z.number().int().positive().describe('Downloaded PNG byte length'),
      fileName: z.string().describe('Suggested attachment file name'),
      attachmentCount: z.number().int().describe('Number of returned Slate attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let thumbnail = await client.getPageThumbnail(
      ctx.input.presentationId,
      ctx.input.pageObjectId,
      ctx.input.thumbnailSize
    );
    let safePageObjectId =
      ctx.input.pageObjectId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'page';
    let fileName = `google-slides-${safePageObjectId}-thumbnail.png`;

    return {
      output: {
        presentationId: ctx.input.presentationId,
        pageObjectId: ctx.input.pageObjectId,
        thumbnailSize: ctx.input.thumbnailSize,
        widthPixels: thumbnail.width,
        heightPixels: thumbnail.height,
        mimeType: thumbnail.mimeType,
        sizeBytes: thumbnail.content.length,
        fileName,
        attachmentCount: 1
      },
      attachments: [
        createBase64Attachment(thumbnail.content.toString('base64'), thumbnail.mimeType)
      ],
      message: `Generated a **${thumbnail.width} x ${thumbnail.height}** PNG thumbnail for slide page \`${ctx.input.pageObjectId}\` and returned it as an attachment.`
    };
  })
  .build();
