import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot of a web page or HTML content. Supports full-page capture, custom image formats, device emulation, and proxy settings. Returns the screenshot data.`
})
  .input(
    z.object({
      url: z
        .string()
        .optional()
        .describe('URL of the web page to capture. Provide either url or html.'),
      html: z
        .string()
        .optional()
        .describe('Raw HTML content to render and capture. Provide either url or html.'),
      fullPage: z
        .boolean()
        .optional()
        .describe(
          'Whether to capture the full page or just the visible viewport. Defaults to false.'
        ),
      imageType: z
        .enum(['jpeg', 'png'])
        .optional()
        .describe('Image format. Defaults to "png".'),
      quality: z.number().optional().describe('Image quality for JPEG (0-100).'),
      omitBackground: z
        .boolean()
        .optional()
        .describe('Whether to omit the page background for transparent screenshots.'),
      timeout: z
        .number()
        .optional()
        .describe('Navigation timeout in milliseconds. Defaults to 30000.'),
      waitUntil: z
        .string()
        .optional()
        .describe(
          'When to consider navigation complete: "load", "domcontentloaded", "networkidle0", or "networkidle2".'
        )
    })
  )
  .output(
    z.object({
      screenshotData: z
        .any()
        .describe(
          'Screenshot response data (may be base64-encoded image or binary buffer depending on the response format).'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.captureScreenshot({
      url: ctx.input.url,
      html: ctx.input.html,
      gotoOptions: {
        timeout: ctx.input.timeout,
        waitUntil: ctx.input.waitUntil
      },
      options: {
        fullPage: ctx.input.fullPage,
        type: ctx.input.imageType,
        quality: ctx.input.quality,
        omitBackground: ctx.input.omitBackground
      }
    });

    return {
      output: {
        screenshotData: result
      },
      message: `Captured screenshot of ${ctx.input.url ? `**${ctx.input.url}**` : 'provided HTML content'}.`
    };
  })
  .build();
