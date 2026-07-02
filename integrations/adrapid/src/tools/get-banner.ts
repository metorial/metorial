import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bannerFileSchema = z.object({
  fileId: z.string().describe('Unique identifier of the banner file'),
  url: z.string().describe('URL to download or preview the banner file'),
  status: z.string().describe('Processing status of the file'),
  name: z.string().optional().describe('File name'),
  type: z.string().optional().describe('File MIME type'),
  size: z.number().optional().describe('File size in bytes'),
  width: z.number().optional().describe('Banner width in pixels'),
  height: z.number().optional().describe('Banner height in pixels')
});

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
  .output(
    z.object({
      bannerId: z.string().describe('Unique identifier of the banner'),
      status: z
        .string()
        .describe('Current status of the banner (exporting, ready, or failed)'),
      templateId: z.string().describe('Template ID used to create the banner'),
      files: z
        .array(bannerFileSchema)
        .describe('List of generated banner files with download URLs')
    })
  )
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

    let readyFiles = banner.files.filter(f => f.status === 'ready').length;

    let statusMessage =
      banner.status === 'ready'
        ? `Banner **${banner.bannerId}** is ready with **${readyFiles}** file(s).`
        : banner.status === 'failed'
          ? `Banner **${banner.bannerId}** has **failed**.`
          : `Banner **${banner.bannerId}** is still **${banner.status}**.`;

    return {
      output: {
        bannerId: banner.bannerId,
        status: banner.status,
        templateId: banner.templateId,
        files: banner.files.map(f => ({
          fileId: f.id,
          url: f.url,
          status: f.status,
          name: f.name,
          type: f.type,
          size: f.size,
          width: f.width,
          height: f.height
        }))
      },
      message: statusMessage
    };
  })
  .build();
