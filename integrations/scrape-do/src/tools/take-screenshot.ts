import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient, validateWholeNumber } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Capture a visual screenshot of any public web page. Supports viewport screenshots, full-page screenshots, and partial screenshots targeting a specific CSS selector. Prepares a downloadable PNG screenshot and includes its image data for existing consumers.
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

    if (input.screenshotType === 'selector' && !input.selector?.trim()) {
      throw createApiServiceError('Provide selector when screenshotType is "selector".');
    }
    validateWholeNumber('width', input.width, 1);
    validateWholeNumber('height', input.height, 1);
    validateWholeNumber('customWait', input.customWait, 0, 35000);
    let result = await client.scrapeUrl({
      url: input.url,
      render: true,
      returnJSON: true,
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

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw createApiServiceError(`The screenshot target returned HTTP ${result.statusCode}.`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(result.body);
    } catch {
      throw createApiServiceError('Scrape.do returned an invalid screenshot response.');
    }
    let parsed = z
      .object({ screenShots: z.array(z.object({ image: z.string().min(1) })).min(1) })
      .safeParse(payload);
    if (!parsed.success)
      throw createApiServiceError('Scrape.do did not return a screenshot image.');
    let screenshotBase64 = parsed.data.screenShots[0]!.image;
    let imageBytes = Buffer.from(screenshotBase64, 'base64');
    if (
      imageBytes.length === 0 ||
      imageBytes.toString('base64') !== screenshotBase64.replace(/\s/g, '')
    ) {
      throw createApiServiceError('Scrape.do returned invalid screenshot image data.');
    }
    await ctx.addAttachment({
      type: 'content',
      content: new Response(imageBytes, { headers: { 'content-type': 'image/png' } }),
      filename: 'screenshot.png',
      mimeType: 'image/png'
    });
    return {
      output: {
        statusCode: result.statusCode,
        screenshotBase64,
        responseHeaders: result.headers
      },
      message: `Captured ${input.screenshotType} screenshot of **${input.url}** — status **${result.statusCode}**.`
    };
  })
  .build();
