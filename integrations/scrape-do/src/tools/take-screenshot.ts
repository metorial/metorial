import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Capture a visual screenshot of any public web page. Supports viewport screenshots, full-page screenshots, and partial screenshots targeting a specific CSS selector. Returns the screenshot as base64-encoded image data.
Configure the viewport size, device type, and geo-targeting to capture location- or device-specific views.`,
  instructions: [
    'Use screenshotType "full" for capturing the entire scrollable page.',
    'Use screenshotType "selector" with a CSS selector to capture a specific element.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the webpage to screenshot'),
      screenshotType: z
        .enum(['viewport', 'full', 'selector'])
        .optional()
        .default('viewport')
        .describe(
          'Type of screenshot: "viewport" for visible area, "full" for full page, "selector" for a specific element'
        ),
      selector: z
        .string()
        .optional()
        .describe(
          'CSS selector for partial screenshot (only used when screenshotType is "selector")'
        ),
      width: z.number().optional().describe('Browser viewport width in pixels'),
      height: z.number().optional().describe('Browser viewport height in pixels'),
      device: z
        .enum(['desktop', 'mobile', 'tablet'])
        .optional()
        .describe('Device type to emulate'),
      geoCode: z.string().optional().describe('ISO country code for geo-targeting'),
      super: z.boolean().optional().describe('Enable residential/mobile proxy pool'),
      waitUntil: z
        .enum(['domcontentloaded', 'networkidle0', 'networkidle2'])
        .optional()
        .describe('Page load event to wait for'),
      customWait: z
        .number()
        .optional()
        .describe('Additional wait time in milliseconds after page load'),
      waitSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before capturing'),
      blockResources: z.boolean().optional().describe('Block CSS, images, and fonts')
    })
  )
  .output(
    z.object({
      statusCode: z.number().describe('HTTP status code'),
      screenshotBase64: z.string().describe('Base64-encoded screenshot image data'),
      responseHeaders: z.record(z.string(), z.string()).describe('HTTP response headers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;

    let result = await client.scrapeUrl({
      url: input.url,
      render: true,
      screenShot: input.screenshotType === 'viewport' ? true : undefined,
      fullScreenShot: input.screenshotType === 'full' ? true : undefined,
      particularScreenShot: input.screenshotType === 'selector' ? input.selector : undefined,
      width: input.width,
      height: input.height,
      device: input.device,
      geoCode: input.geoCode,
      super: input.super,
      waitUntil: input.waitUntil,
      customWait: input.customWait,
      waitSelector: input.waitSelector,
      blockResources: input.blockResources
    });

    return {
      output: {
        statusCode: result.statusCode,
        screenshotBase64: result.body,
        responseHeaders: result.headers
      },
      message: `Captured ${input.screenshotType} screenshot of **${input.url}** — status **${result.statusCode}**.`
    };
  })
  .build();
