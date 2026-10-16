import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',

  description: `Capture a screenshot of a website and prepare the image for download. Configure viewport size, full-page capture, dark mode, and image format. Each capture uses the account's screenshot allowance.`,

  instructions: [
    'Provide a fully qualified URL including the protocol (e.g., https://example.com).',
    'Use positive whole-number width and height values to simulate specific device viewports (e.g., 375x812 for iPhone, 1920x1080 for desktop).',
    'Save the downloadable image promptly. The provider does not publish an exact lifetime for its screenshot URLs.',
    'If capture succeeds but delivery fails, use the returned screenshot URL. Repeating the tool creates another capture and may use additional allowance.'
  ],

  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('The full URL of the website to capture (e.g., https://example.com).'),
      fullPage: z
        .boolean()
        .optional()
        .describe(
          'Capture the entire page from header to footer. When false, only the visible viewport is captured.'
        ),
      width: z
        .number()
        .optional()
        .describe('Viewport width in pixels (e.g., 1280 for desktop, 375 for mobile).'),
      height: z
        .number()
        .optional()
        .describe('Viewport height in pixels (e.g., 800 for desktop, 812 for mobile).'),
      darkMode: z
        .boolean()
        .optional()
        .describe('Capture the website in dark mode. Defaults to false.'),
      disableCookieBanners: z
        .boolean()
        .optional()
        .describe(
          'Automatically remove cookie banners, popups, and chat widgets. Defaults to true.'
        ),
      format: z
        .enum(['png', 'jpg', 'jpeg'])
        .optional()
        .describe('Output image format. Defaults to jpg.')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().describe('Provider URL to the captured screenshot image.'),
      deliveryWarning: z
        .string()
        .optional()
        .describe(
          'Delivery warning when capture succeeded but a downloadable file could not be prepared.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    ctx.info({ message: 'Taking screenshot' });

    let result = await client.takeScreenshot({
      url: ctx.input.url,
      fullPage: ctx.input.fullPage,
      width: ctx.input.width,
      height: ctx.input.height,
      darkMode: ctx.input.darkMode,
      disableCookieBanners: ctx.input.disableCookieBanners,
      format: ctx.input.format
    });

    let deliveryWarning: string | undefined;
    try {
      let file = await client.downloadScreenshot(result.screenshotUrl);
      await ctx.addAttachment({ type: 'content', ...file });
    } catch {
      deliveryWarning =
        'The screenshot was captured, but its downloadable file could not be prepared. Use screenshotUrl promptly. Do not repeat the capture unless you intend to use more screenshot allowance.';
    }

    return {
      output: {
        screenshotUrl: result.screenshotUrl,
        ...(deliveryWarning ? { deliveryWarning } : {})
      },
      message: deliveryWarning ?? 'Screenshot captured and prepared for download.'
    };
  })
  .build();
