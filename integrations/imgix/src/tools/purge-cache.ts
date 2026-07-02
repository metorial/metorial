import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let purgeCache = SlateTool.create(spec, {
  name: 'Purge Cache',
  key: 'purge_cache',
  description: `Purge a cached asset from the Imgix CDN. When an asset is updated at the origin, use this to force Imgix to fetch the newest version. Purging an asset URL automatically removes all derivative (transformed) versions. For watermark or blend sub-images, enable the subImage flag to cascade purges to all parent images.`,
  constraints: [
    'Duplicate purge requests for the same URL within 10 seconds may return a 409 status.',
    'Rate limit: 10 requests per second.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'Fully qualified URL of the asset to purge (e.g., "https://example.imgix.net/image.jpg"). No query parameters needed.'
        ),
      subImage: z
        .boolean()
        .optional()
        .describe(
          'Set to true if purging a watermark, blend, or mask sub-image to cascade purge to parent images'
        ),
      sourceId: z.string().optional().describe('Source ID, required when subImage is true')
    })
  )
  .output(
    z.object({
      purgeId: z.string().describe('Unique identifier for the purge request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    let result = await client.purge(ctx.input.url, {
      subImage: ctx.input.subImage,
      sourceId: ctx.input.sourceId
    });

    let purgeId = result.data?.attributes?.purge_id ?? result.data?.id ?? '';

    return {
      output: { purgeId },
      message: `Purged **${ctx.input.url}**${ctx.input.subImage ? ' (including parent images)' : ''}. Purge ID: \`${purgeId}\`.`
    };
  })
  .build();
