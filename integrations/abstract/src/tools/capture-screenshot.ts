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
      width: z.number().optional().describe('Viewport width in pixels'),
      height: z.number().optional().describe('Viewport height in pixels'),
      exportFormat: z
        .enum(['jpeg', 'png'])
        .optional()
        .describe('Image format; defaults to JPEG'),
      userAgent: z.string().optional().describe('User Agent to use when capturing the page'),
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
      cssInjection: ctx.input.cssInjection,
      exportFormat: ctx.input.exportFormat,
      userAgent: ctx.input.userAgent
    });

    let screenshotUrl =
      result?.url ??
      result?.screenshot_url ??
      (typeof result === 'string' ? result : undefined);

    let query: Record<string, string> = { url: ctx.input.url };
    if (ctx.input.captureFullPage !== undefined)
      query.capture_full_page = String(ctx.input.captureFullPage);
    if (ctx.input.delay !== undefined) query.delay = String(ctx.input.delay / 1000);
    if (ctx.input.width !== undefined) query.width = String(ctx.input.width);
    if (ctx.input.height !== undefined) query.height = String(ctx.input.height);
    if (ctx.input.cssInjection !== undefined) query.css_injection = ctx.input.cssInjection;
    if (ctx.input.userAgent !== undefined) query.user_agent = ctx.input.userAgent;
    if (ctx.input.exportFormat !== undefined) query.export_format = ctx.input.exportFormat;
    await ctx.addAttachment({
      type: 'url',
      ...client.fileRequest('screenshot', query),
      mimeType: ctx.input.exportFormat === 'png' ? 'image/png' : 'image/jpeg'
    });

    return {
      output: {
        url: ctx.input.url,
        screenshotUrl
      },
      message: `Captured screenshot of **${ctx.input.url}**. A screenshot is available to download.`
    };
  })
  .build();
