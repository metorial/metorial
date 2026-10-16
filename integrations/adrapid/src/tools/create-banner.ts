import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bannerSchema, getBannerOutput } from '../lib/schemas';
import { spec } from '../spec';

export let createBanner = SlateTool.create(spec, {
  name: 'Create Banner',
  key: 'create_banner',
  description: `Create image, video, or HTML5 banners from an Adrapid template. Supports generating banners in multiple formats (png, jpeg, webp, html5, video) simultaneously. Template content such as text, images, and CSS can be customized using overrides. Banners can be generated in specific sizes or all available sizes for a template.

By default, the tool waits for processing for about one minute. Completed files are available to download; a longer-running export returns its current status for subsequent checks.`,
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
          'Output formats. Set image formats to true, for example { "png": true, "jpeg": true }; video accepts options such as { "video": { "fps": 30, "crf": 18 } }. PDF, GIF, WebP, and HTML5 are also documented.'
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
      sizes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Custom size definitions supported by Adrapid'),
      clicktag: z
        .string()
        .optional()
        .describe('Destination URL used when the banner is clicked'),
      editable: z
        .boolean()
        .optional()
        .describe('Create an editable copy of the banner as a template'),
      excludeBaseSize: z
        .boolean()
        .optional()
        .describe('Exclude the base size when exporting multiple sizes'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe('Whether to poll and wait for the banner to be ready. Defaults to true.')
    })
  )
  .output(bannerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Creating banner from template...');

    let banner = await client.createBanner({
      templateId: ctx.input.templateId,
      modes: ctx.input.modes,
      sizeIds: ctx.input.sizeIds,
      overrides: ctx.input.overrides,
      sizes: ctx.input.sizes,
      clicktag: ctx.input.clicktag,
      editable: ctx.input.editable,
      excludeBaseSize: ctx.input.excludeBaseSize
    });

    let shouldWait = ctx.input.waitForCompletion !== false;

    if (shouldWait && banner.status !== 'ready' && banner.status !== 'failed') {
      ctx.progress('Banner is processing, waiting for completion...');
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
        ? `Banner created successfully with **${readyFiles.length}** file(s) ready for download.`
        : banner.status === 'failed'
          ? `Banner creation **failed**.`
          : `Banner is still **${banner.status}**. Poll the banner using Get Banner to check completion.`;

    return {
      output: getBannerOutput(banner),
      message: statusMessage
    };
  })
  .build();
