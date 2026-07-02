import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot of a web page. Supports full-page screenshots, custom viewport sizes, and element-specific screenshots. Returns the screenshot as a base64-encoded PNG image.`,
  instructions: [
    'Set fullPage to true to capture the entire page including scrollable content.',
    'Use windowWidth and windowHeight to control the viewport size for responsive testing.',
    'Use screenshotSelector to capture only a specific element on the page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the web page to screenshot'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the full page height including scrollable content'),
      windowWidth: z.number().optional().describe('Viewport width in pixels (default 1920)'),
      windowHeight: z.number().optional().describe('Viewport height in pixels (default 1080)'),
      screenshotSelector: z
        .string()
        .optional()
        .describe('CSS selector of a specific element to screenshot'),
      renderJs: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering (recommended for dynamic pages)'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use premium proxies for difficult-to-scrape websites'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      wait: z
        .number()
        .optional()
        .describe('Time in milliseconds to wait after page load before capturing'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before capturing screenshot')
    })
  )
  .output(
    z.object({
      screenshotBase64: z.string().describe('Base64-encoded PNG screenshot image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let base64 = await client.captureScreenshot({
      url: ctx.input.url,
      fullPage: ctx.input.fullPage,
      windowWidth: ctx.input.windowWidth,
      windowHeight: ctx.input.windowHeight,
      screenshotSelector: ctx.input.screenshotSelector,
      renderJs: ctx.input.renderJs,
      premiumProxy: ctx.input.premiumProxy,
      countryCode: ctx.input.countryCode,
      device: ctx.input.device,
      wait: ctx.input.wait,
      waitFor: ctx.input.waitFor
    });

    return {
      output: {
        screenshotBase64: base64
      },
      message: `Successfully captured screenshot of **${ctx.input.url}**${ctx.input.fullPage ? ' (full page)' : ''}.`
    };
  });
