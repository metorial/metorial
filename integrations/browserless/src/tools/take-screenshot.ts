import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';
import {
  fileAttachment,
  fileOutput,
  fileOutputSchema,
  gotoOptionsSchema,
  requireExactlyOneSource,
  waitForSelectorSchema
} from './shared';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Capture a screenshot of a web page or rendered HTML. Supports full-page captures, custom viewports, clipping regions, and multiple image formats (PNG, JPEG, WebP). Returns the image bytes as a Slate attachment with metadata in the tool output.`,
  instructions: [
    'Provide either a URL or raw HTML to capture.',
    'The returned image content is in response attachments, not inline output fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the page to screenshot'),
      html: z.string().optional().describe('Raw HTML content to render and capture'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the full scrollable page instead of just the viewport'),
      imageFormat: z.enum(['png', 'jpeg', 'webp']).optional().describe('Output image format'),
      quality: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Image quality (0-100), only for JPEG and WebP'),
      omitBackground: z
        .boolean()
        .optional()
        .describe('Make background transparent (PNG only)'),
      clip: z
        .object({
          x: z.number().describe('X coordinate'),
          y: z.number().describe('Y coordinate'),
          width: z.number().describe('Width of the clipping region'),
          height: z.number().describe('Height of the clipping region')
        })
        .optional()
        .describe('Clip a specific region of the page'),
      gotoOptions: gotoOptionsSchema,
      waitForSelector: waitForSelectorSchema,
      waitForTimeout: z.number().optional().describe('Wait a fixed number of milliseconds'),
      bestAttempt: z.boolean().optional().describe('Proceed even when async events fail'),
      rejectResourceTypes: z.array(z.string()).optional().describe('Resource types to block'),
      userAgent: z.string().optional().describe('Custom User-Agent string')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let input = ctx.input;
    let format = input.imageFormat ?? 'png';
    requireExactlyOneSource(input);

    let file = await client.takeScreenshot({
      url: input.url,
      html: input.html,
      gotoOptions: input.gotoOptions,
      waitForSelector: input.waitForSelector,
      waitForTimeout: input.waitForTimeout,
      bestAttempt: input.bestAttempt,
      rejectResourceTypes: input.rejectResourceTypes,
      userAgent: input.userAgent,
      options: {
        fullPage: input.fullPage,
        type: format,
        quality: input.quality,
        omitBackground: input.omitBackground,
        clip: input.clip
      }
    });

    let source = input.url ?? 'provided HTML';

    return {
      output: fileOutput(file),
      attachments: [fileAttachment(file)],
      message: `Captured ${format.toUpperCase()} screenshot of ${source}${input.fullPage ? ' (full page)' : ''}.`
    };
  })
  .build();
