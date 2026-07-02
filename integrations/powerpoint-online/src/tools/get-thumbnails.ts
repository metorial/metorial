import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemLocationSchema } from '../lib/schemas';
import { spec } from '../spec';

let thumbnailSchema = z.object({
  setId: z
    .string()
    .optional()
    .describe('Thumbnail set ID (typically corresponds to a slide/page index)'),
  smallUrl: z.string().optional().describe('URL of the small thumbnail'),
  smallWidth: z.number().optional().describe('Width of the small thumbnail in pixels'),
  smallHeight: z.number().optional().describe('Height of the small thumbnail in pixels'),
  mediumUrl: z.string().optional().describe('URL of the medium thumbnail'),
  mediumWidth: z.number().optional().describe('Width of the medium thumbnail in pixels'),
  mediumHeight: z.number().optional().describe('Height of the medium thumbnail in pixels'),
  largeUrl: z.string().optional().describe('URL of the large thumbnail'),
  largeWidth: z.number().optional().describe('Width of the large thumbnail in pixels'),
  largeHeight: z.number().optional().describe('Height of the large thumbnail in pixels')
});

export let getThumbnails = SlateTool.create(spec, {
  name: 'Get Thumbnails',
  key: 'get_thumbnails',
  description: `Retrieve thumbnail images for each page/slide of a PowerPoint presentation. Returns URLs for small, medium, and large thumbnails per slide. Also supports generating an embeddable preview URL for the presentation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    driveItemLocationSchema.extend({
      includePreviewUrl: z
        .boolean()
        .optional()
        .describe(
          'Also generate an embeddable preview URL for the presentation. Only available for SharePoint and OneDrive for Business.'
        )
    })
  )
  .output(
    z.object({
      thumbnails: z.array(thumbnailSchema).describe('Thumbnail images per slide/page'),
      previewGetUrl: z.string().optional().describe('Embeddable preview URL (GET)'),
      previewPostUrl: z.string().optional().describe('Embeddable preview URL (POST)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let thumbnailSets = await client.getThumbnails({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId
    });

    let thumbnails = thumbnailSets.map(set => ({
      setId: set.id,
      smallUrl: set.small?.url,
      smallWidth: set.small?.width,
      smallHeight: set.small?.height,
      mediumUrl: set.medium?.url,
      mediumWidth: set.medium?.width,
      mediumHeight: set.medium?.height,
      largeUrl: set.large?.url,
      largeWidth: set.large?.width,
      largeHeight: set.large?.height
    }));

    let previewGetUrl: string | undefined;
    let previewPostUrl: string | undefined;

    if (ctx.input.includePreviewUrl) {
      try {
        let preview = await client.getPreviewUrl({
          itemId: ctx.input.itemId,
          itemPath: ctx.input.itemPath,
          driveId: ctx.input.driveId,
          siteId: ctx.input.siteId
        });
        previewGetUrl = preview.getUrl || undefined;
        previewPostUrl = preview.postUrl || undefined;
      } catch (_e) {
        ctx.warn(
          'Preview URL generation failed — this feature is only available for SharePoint and OneDrive for Business.'
        );
      }
    }

    return {
      output: {
        thumbnails,
        previewGetUrl,
        previewPostUrl
      },
      message: `Retrieved **${thumbnails.length}** thumbnail set(s)${previewGetUrl ? ' with preview URL' : ''}`
    };
  })
  .build();
