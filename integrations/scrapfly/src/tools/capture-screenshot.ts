import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot of any web page. Supports full-page captures, viewport-only captures, or targeting specific elements via CSS selectors. Includes options for ad/banner blocking, dark mode, custom viewport resolution, accessibility testing, and JavaScript execution before capture.`,
  instructions: [
    'Use **capture** to target specific elements: "fullpage" for the entire page, "viewport" for visible area, or a CSS selector like ".main-content" for a specific element.',
    'Set **options** to "block_banners" to remove ads/popups, "dark_mode" for dark mode, or combine them with commas.',
    'Use **visionDeficiency** for accessibility testing (e.g., "deuteranopia", "protanopia").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Target URL to capture a screenshot of.'),
      format: z
        .enum(['jpg', 'png', 'webp', 'gif'])
        .optional()
        .describe('Image format for the screenshot.'),
      capture: z
        .string()
        .optional()
        .describe(
          'Capture mode: "viewport", "fullpage", or a CSS/XPath selector for specific elements.'
        ),
      resolution: z
        .string()
        .optional()
        .describe(
          'Screen resolution in WIDTHxHEIGHT format (e.g., "1920x1080", "375x812" for mobile).'
        ),
      country: z.string().optional().describe('Proxy country code (ISO 3166-1 alpha-2).'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum timeout in milliseconds (60000-120000).'),
      renderingWait: z
        .number()
        .optional()
        .describe('Delay in milliseconds to wait after page load.'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector or XPath to wait for before capturing.'),
      options: z
        .string()
        .optional()
        .describe('Comma-separated flags: dark_mode, block_banners, print_media_format.'),
      autoScroll: z
        .boolean()
        .optional()
        .describe('Auto-scroll to bottom to trigger lazy-loaded content.'),
      js: z
        .string()
        .optional()
        .describe('Base64-encoded JavaScript to execute before taking the screenshot.'),
      cache: z.boolean().optional().describe('Enable caching for repeated screenshots.'),
      cacheTtl: z.number().optional().describe('Cache time-to-live in seconds.'),
      visionDeficiency: z
        .enum([
          'none',
          'deuteranopia',
          'protanopia',
          'tritanopia',
          'achromatopsia',
          'blurredVision'
        ])
        .optional()
        .describe(
          'Simulate vision deficiency for accessibility testing (WCAG, ADA, Section 508).'
        ),
      asp: z.boolean().optional().describe('Enable Anti-Scraping Protection bypass.'),
      proxyPool: z
        .enum(['public_datacenter_pool', 'public_residential_pool'])
        .optional()
        .describe('Proxy pool to use.')
    })
  )
  .output(
    z.object({
      screenshotUrl: z
        .string()
        .describe('URL where the screenshot is stored on Scrapfly servers.'),
      imageBase64: z.string().describe('Base64-encoded screenshot image data.'),
      imageFormat: z.string().describe('Format of the captured image.'),
      upstreamStatusCode: z
        .number()
        .optional()
        .describe('HTTP status code of the target page.'),
      upstreamUrl: z
        .string()
        .optional()
        .describe('Final URL of the target page after redirects.'),
      apiCost: z.number().optional().describe('API credits consumed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.screenshot({
      url: ctx.input.url,
      format: ctx.input.format,
      capture: ctx.input.capture,
      resolution: ctx.input.resolution,
      country: ctx.input.country,
      timeout: ctx.input.timeout,
      renderingWait: ctx.input.renderingWait,
      waitForSelector: ctx.input.waitForSelector,
      options: ctx.input.options,
      autoScroll: ctx.input.autoScroll,
      js: ctx.input.js,
      cache: ctx.input.cache,
      cacheTtl: ctx.input.cacheTtl,
      visionDeficiency: ctx.input.visionDeficiency,
      asp: ctx.input.asp,
      proxyPool: ctx.input.proxyPool
    });

    return {
      output: result,
      message: `Captured screenshot of **${ctx.input.url}** in ${result.imageFormat} format. Stored at: ${result.screenshotUrl}`
    };
  })
  .build();
