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

export let createBanner = SlateTool.create(spec, {
  name: 'Create Banner',
  key: 'create_banner',
  description: `Create image, video, or HTML5 banners from an Adrapid template. Supports generating banners in multiple formats (png, jpeg, webp, html5, video) simultaneously. Template content such as text, images, and CSS can be customized using overrides. Banners can be generated in specific sizes or all available sizes for a template.

The tool will wait for the banner to finish processing and return the resulting files with download URLs.`,
  instructions: [
    'Use the template ID from the Adrapid editor or template library.',
    'Override items are referenced by their item name as defined in the Adrapid editor (e.g., "Text_item_1", "Image_item_1").',
    'Set sizeIds to "all" to generate banners in all available sizes for the template.',
    'Multiple modes can be set at once to get different output files for each format.'
  ],
  constraints: [
    'Banner creation is asynchronous. The tool polls until processing completes or a timeout is reached.',
    'Processing time depends on the number of sizes and formats requested, and system load.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the Adrapid template to use for banner creation'),
      modes: z
        .record(z.string(), z.any())
        .describe(
          'Output format modes. Keys are format names (png, jpeg, webp, html5, video). Values are format-specific options (e.g., { "png": {}, "video": { "fps": 30, "crf": 18 } })'
        ),
      sizeIds: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
          'Size IDs to generate. Use "all" for all available sizes, or provide specific size IDs. Omit to use the default size only.'
        ),
      overrides: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Template content overrides. Keys are item names from the editor. Values can include text, url (for images), and css properties (e.g., { "Text_item_1": { "text": "Hello", "css": { "color": "red" } } })'
        ),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe('Whether to poll and wait for the banner to be ready. Defaults to true.')
    })
  )
  .output(
    z.object({
      bannerId: z.string().describe('Unique identifier of the created banner'),
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

    ctx.progress('Creating banner from template...');

    let banner = await client.createBanner({
      templateId: ctx.input.templateId,
      modes: ctx.input.modes,
      sizeIds: ctx.input.sizeIds,
      overrides: ctx.input.overrides
    });

    let shouldWait = ctx.input.waitForCompletion !== false;

    if (shouldWait && banner.status !== 'ready' && banner.status !== 'failed') {
      ctx.progress('Banner is processing, waiting for completion...');
      banner = await client.pollBannerUntilReady(banner.bannerId);
    }

    let readyFiles = banner.files.filter(f => f.status === 'ready').length;

    let statusMessage =
      banner.status === 'ready'
        ? `Banner created successfully with **${readyFiles}** file(s) ready for download.`
        : banner.status === 'failed'
          ? `Banner creation **failed**.`
          : `Banner is still **${banner.status}**. Poll the banner using Get Banner to check completion.`;

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
