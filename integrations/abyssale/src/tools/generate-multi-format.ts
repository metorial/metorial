import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let generateMultiFormat = SlateTool.create(spec, {
  name: 'Generate Multi-Format',
  key: 'generate_multi_format',
  description: `Start an asynchronous generation of multiple formats (images, videos, PDFs, GIFs, or HTML5 banners) from a single design. Returns a generation request ID for tracking progress. Use "Get Generation Status" to poll for results, or provide a callback URL to receive a webhook when complete.`,
  instructions: [
    'Omit `templateFormatNames` to generate all formats defined in the design.',
    'For HTML5 banner generation, set `imageFileType` to "html5" and configure the `html5` options.',
    'Use the "Get Generation Status" tool to check if generation is complete.'
  ],
  constraints: [
    'Asynchronous — results are not immediately available.',
    'Rate limited. Do not flood this endpoint.',
    'Generation requests expire after 7 days.',
    'Poll Get Generation Status or use a callback URL to receive completion results.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      designId: z.string().describe('UUID of the design to generate from'),
      templateFormatNames: z
        .array(z.string())
        .optional()
        .describe(
          'Array of format names to generate. Omit to generate all formats defined in the design.'
        ),
      elements: z
        .record(z.string(), z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Element overrides keyed by layer name. Each value is an object with element properties.'
        ),
      imageFileType: z
        .enum(['png', 'jpeg', 'webp', 'avif', 'pdf', 'html5', 'gif', 'mp4', 'auto'])
        .optional()
        .describe('Override default output file type.'),
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'Webhook URL to receive the NEW_BANNER_BATCH event when generation completes.'
        ),
      html5: z
        .object({
          clickTag: z
            .string()
            .optional()
            .describe('Click tag URL or macro for the HTML5 banner'),
          pageTitle: z.string().optional().describe('Page title for the HTML5 banner'),
          adNetwork: z
            .enum([
              'default',
              'google-ads',
              'google-marketing',
              'adform',
              'amazon-ads',
              'adroll'
            ])
            .optional()
            .describe('Target ad network for HTML5 generation'),
          repeat: z
            .number()
            .optional()
            .describe('Animation repeat count. -1 for infinite, 0 for once.'),
          includeBackupImage: z
            .boolean()
            .optional()
            .describe('Include a static backup image in the HTML5 package')
        })
        .optional()
        .describe('HTML5 banner-specific options. Only used when imageFileType is "html5".'),
      fileCompressionLevel: z
        .number()
        .optional()
        .describe('Output quality from 1 to 100; 100 is best quality.'),
      originalVisualId: z
        .string()
        .optional()
        .describe('Existing visual ID to regenerate in place; target one format.'),
      gif: z
        .object({
          maxFps: z.number().optional().describe('GIF frame rate, an integer from 2 to 9.'),
          repeat: z.number().optional().describe('Loop repetitions from -1 (infinite) to 100.')
        })
        .optional(),
      video: z
        .object({
          fps: z.number().optional().describe('Video frame rate, an integer from 2 to 30.')
        })
        .optional(),
      print: z
        .object({
          colorProfile: z
            .string()
            .optional()
            .describe('Provider color profile UUID; omit to use the design profile.'),
          displayCropMarks: z.boolean().optional()
        })
        .optional(),
      pages: z
        .record(z.string(), z.record(z.string(), z.record(z.string(), z.any())))
        .optional()
        .describe(
          'Multipage print only: element overrides keyed by page ID and then layer name. Call get_design to inspect pages.'
        )
    })
  )
  .output(
    z.object({
      generationRequestId: z.string().describe('UUID to track this generation request'),
      raw: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.generateMultiFormat(ctx.input.designId, {
      templateFormatNames: ctx.input.templateFormatNames,
      elements: ctx.input.elements,
      imageFileType: ctx.input.imageFileType,
      callbackUrl: ctx.input.callbackUrl,
      html5: ctx.input.html5,
      gif: ctx.input.gif,
      video: ctx.input.video,
      print: ctx.input.print,
      pages: ctx.input.pages,
      fileCompressionLevel: ctx.input.fileCompressionLevel,
      originalVisualId: ctx.input.originalVisualId
    });

    let formatCount = ctx.input.templateFormatNames?.length;
    let formatDesc = formatCount ? `**${formatCount}** format(s)` : '**all formats**';

    return {
      output: {
        generationRequestId: result.generation_request_id,
        raw: result
      },
      message: `Started async generation of ${formatDesc} for design \`${ctx.input.designId}\`. Generation request ID: \`${result.generation_request_id}\`. ${ctx.input.callbackUrl ? 'Results will be delivered via webhook.' : 'Use "Get Generation Status" to poll for results.'}`
    };
  })
  .build();
