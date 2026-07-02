import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot of any webpage. Returns a URL to the screenshot image. Supports multiple viewport sizes, full-page capture, element-specific capture via CSS selectors, and image format/quality settings.

Use this for visual previews, monitoring, or archiving webpage appearances.`,
  instructions: [
    'Use the dimensions parameter to simulate different device sizes: xs (mobile 375×812), sm (tablet 1024×768), md (laptop 1366×768), lg (desktop 1920×1080).',
    'Set fullPage to true to capture the entire scrollable page, not just the viewport.',
    'Use selector to capture a specific element on the page.'
  ],
  constraints: [
    'Screenshot URLs expire after 24 hours.',
    'Quality accepts values from 10 to 80 in increments of 10.',
    'Capture delay is limited to 0-10000 milliseconds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the page to screenshot'),
      format: z
        .enum(['jpeg', 'png', 'webp'])
        .optional()
        .describe('Image format. Defaults to jpeg.'),
      quality: z
        .number()
        .optional()
        .describe('Image quality from 10 to 80 (increments of 10). Defaults to 80.'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the entire scrollable page instead of just the viewport.'),
      dimensions: z
        .enum(['xs', 'sm', 'md', 'lg'])
        .optional()
        .describe(
          'Viewport size preset: xs (mobile 375×812), sm (tablet 1024×768), md (laptop 1366×768), lg (desktop 1920×1080). Defaults to md.'
        ),
      selector: z
        .string()
        .optional()
        .describe('CSS selector to capture a specific element instead of the full page.'),
      excludeSelectors: z
        .string()
        .optional()
        .describe('Comma-separated CSS selectors to hide from the screenshot.'),
      blockCookieBanner: z
        .boolean()
        .optional()
        .describe('Automatically hide cookie consent banners. Defaults to true.'),
      darkMode: z.boolean().optional().describe('Enable dark mode preference for the page.'),
      cacheOk: z.boolean().optional().describe('Allow cached results. Defaults to true.'),
      useProxy: z.boolean().optional().describe('Route request through a proxy server.'),
      captureDelay: z
        .number()
        .optional()
        .describe('Wait time in milliseconds before capturing (0-10000).'),
      navigationTimeout: z
        .number()
        .optional()
        .describe('Page load timeout in milliseconds (1000-60000). Defaults to 30000.')
    })
  )
  .output(
    z.object({
      screenshotUrl: z
        .string()
        .describe('URL to the screenshot image (expires after 24 hours)'),
      dimensions: z
        .object({
          width: z.number().optional(),
          height: z.number().optional()
        })
        .optional()
        .describe('Dimensions of the captured screenshot'),
      requestInfo: z
        .object({
          host: z.string().optional(),
          responseCode: z.number().optional()
        })
        .optional()
        .describe('HTTP request metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.captureScreenshot(ctx.input.url, {
      format: ctx.input.format,
      quality: ctx.input.quality,
      fullPage: ctx.input.fullPage,
      dimensions: ctx.input.dimensions,
      selector: ctx.input.selector,
      excludeSelectors: ctx.input.excludeSelectors,
      blockCookieBanner: ctx.input.blockCookieBanner,
      darkMode: ctx.input.darkMode,
      cacheOk: ctx.input.cacheOk,
      useProxy: ctx.input.useProxy,
      captureDelay: ctx.input.captureDelay,
      navigationTimeout: ctx.input.navigationTimeout
    });

    let dims = result.dimensions;
    let sizeInfo = dims ? ` (${dims.width}×${dims.height})` : '';

    return {
      output: {
        screenshotUrl: result.screenshotUrl,
        dimensions: result.dimensions,
        requestInfo: result.requestInfo
      },
      message: `Captured screenshot of \`${ctx.input.url}\`${sizeInfo}. [View screenshot](${result.screenshotUrl}) — link expires in 24 hours.`
    };
  });
