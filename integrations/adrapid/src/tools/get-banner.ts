import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bannerSchema, getBannerOutput } from '../lib/schemas';
import { spec } from '../spec';

export let getBanner = SlateTool.create(spec, {
  name: 'Get Banner',
  key: 'get_banner',
  description: `Retrieve a previously created banner by its ID. Returns the banner's current processing status and, if ready, the generated files with download URLs. Use this to check on the progress of an asynchronous banner creation or to retrieve file URLs for a completed banner.`,
  instructions: [
    'If the banner status is "exporting", it is still being processed. You can enable waitForCompletion to poll until it is done.',
    'When status is "ready", the files array will contain download URLs for each generated format and size.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      bannerId: z.string().describe('ID of the banner to retrieve'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'Whether to poll and wait for the banner to finish processing if it is still exporting. Defaults to false.'
        )
    })
  )
  .output(bannerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let banner = await client.getBanner(ctx.input.bannerId);

    if (
      ctx.input.waitForCompletion &&
      banner.status !== 'ready' &&
      banner.status !== 'failed'
    ) {
      ctx.progress('Banner is still processing, waiting for completion...');
      banner = await client.pollBannerUntilReady(banner.bannerId);
    }

    let readyFiles = banner.files.filter(
      f => f.url && (banner.status === 'ready' || f.status === 'ready')
    );
    for (let file of readyFiles) {
      if (file.url) {
        await ctx.addAttachment({ type: 'url', url: file.url, filename: file.name });
      }
    }

    let statusMessage =
      banner.status === 'ready'
        ? `Banner **${banner.bannerId}** is ready with **${readyFiles.length}** downloadable file(s).`
        : banner.status === 'failed'
          ? `Banner **${banner.bannerId}** has **failed**.`
          : `Banner **${banner.bannerId}** is still **${banner.status}**.`;

    return {
      output: getBannerOutput(banner),
      message: statusMessage
    };
  })
  .build();
