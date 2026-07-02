import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Captures a screenshot of any web page by URL. Configure viewport dimensions, full-page capture, delay before capture, and CSS injection for customization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the page to screenshot'),
      captureFullPage: z
        .boolean()
        .optional()
        .describe('Whether to capture the full scrollable page instead of just the viewport'),
      delay: z
        .number()
        .optional()
        .describe(
          'Delay in milliseconds before capturing the screenshot (useful for page load)'
        ),
      width: z.number().optional().describe('Viewport width in pixels (default: 1920)'),
      height: z.number().optional().describe('Viewport height in pixels (default: 1080)'),
      cssInjection: z
        .string()
        .optional()
        .describe('Custom CSS to inject into the page before capturing')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The URL that was captured'),
      screenshotUrl: z.string().optional().describe('URL of the generated screenshot image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.captureScreenshot({
      url: ctx.input.url,
      captureFullPage: ctx.input.captureFullPage,
      delay: ctx.input.delay,
      width: ctx.input.width,
      height: ctx.input.height,
      cssInjection: ctx.input.cssInjection
    });

    let screenshotUrl =
      result?.url ??
      result?.screenshot_url ??
      (typeof result === 'string' ? result : undefined);

    return {
      output: {
        url: ctx.input.url,
        screenshotUrl
      },
      message: `Captured screenshot of **${ctx.input.url}**${screenshotUrl ? `: [View screenshot](${screenshotUrl})` : ''}.`
    };
  })
  .build();
