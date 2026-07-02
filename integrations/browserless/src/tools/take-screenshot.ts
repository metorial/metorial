import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Capture a screenshot of a web page or rendered HTML. Supports full-page captures, custom viewports, clipping regions, and multiple image formats (PNG, JPEG, WebP). Returns the screenshot as a base64-encoded string.`,
  instructions: [
    'Provide either a URL or raw HTML to capture.',
    'The returned image is base64-encoded.'
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
      gotoOptions: z
        .object({
          waitUntil: z
            .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
            .optional(),
          timeout: z.number().optional()
        })
        .optional()
        .describe('Navigation options'),
      waitForSelector: z
        .object({
          selector: z.string(),
          timeout: z.number().optional(),
          visible: z.boolean().optional()
        })
        .optional()
        .describe('Wait for a CSS selector before taking the screenshot'),
      waitForTimeout: z.number().optional().describe('Wait a fixed number of milliseconds'),
      bestAttempt: z.boolean().optional().describe('Proceed even when async events fail'),
      rejectResourceTypes: z.array(z.string()).optional().describe('Resource types to block'),
      userAgent: z.string().optional().describe('Custom User-Agent string')
    })
  )
  .output(
    z.object({
      screenshotBase64: z.string().describe('Base64-encoded screenshot image'),
      imageFormat: z.string().describe('Format of the returned image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let input = ctx.input;
    let format = input.imageFormat ?? 'png';

    let screenshotBase64 = await client.takeScreenshot({
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
      output: { screenshotBase64, imageFormat: format },
      message: `Captured ${format.toUpperCase()} screenshot of ${source}${input.fullPage ? ' (full page)' : ''}.`
    };
  })
  .build();
