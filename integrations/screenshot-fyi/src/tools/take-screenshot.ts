import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',

  description: `Capture a screenshot of any website. Configure viewport size for mobile or desktop views, enable full-page capture, toggle dark mode, and choose the output image format. Returns a URL to the captured screenshot image.`,

  instructions: [
    'Provide a fully qualified URL including the protocol (e.g., https://example.com).',
    'Use width and height to simulate specific device viewports (e.g., 375x812 for iPhone, 1920x1080 for desktop).'
  ],

  tags: {
    destructive: false,
    readOnly: true
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
      screenshotUrl: z.string().describe('URL to the captured screenshot image.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    ctx.info({ message: 'Taking screenshot', url: ctx.input.url });

    let result = await client.takeScreenshot({
      url: ctx.input.url,
      fullPage: ctx.input.fullPage,
      width: ctx.input.width,
      height: ctx.input.height,
      darkMode: ctx.input.darkMode,
      disableCookieBanners: ctx.input.disableCookieBanners,
      format: ctx.input.format
    });

    return {
      output: {
        screenshotUrl: result.screenshotUrl
      },
      message: `Screenshot captured for **${ctx.input.url}**. [View screenshot](${result.screenshotUrl})`
    };
  })
  .build();
