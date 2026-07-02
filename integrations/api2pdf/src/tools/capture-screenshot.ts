import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

let imageOptionsSchema = z
  .object({
    delay: z
      .number()
      .optional()
      .describe('Delay in milliseconds before capturing the screenshot'),
    fullPage: z
      .boolean()
      .optional()
      .describe('Capture the full scrollable page, defaults to true'),
    viewPortOptions: z
      .object({
        width: z.number().optional().describe('Viewport width in pixels, defaults to 1920'),
        height: z.number().optional().describe('Viewport height in pixels, defaults to 1080'),
        isMobile: z.boolean().optional().describe('Simulate mobile device'),
        deviceScaleFactor: z.number().optional().describe('Device pixel ratio, defaults to 1'),
        isLandscape: z.boolean().optional().describe('Use landscape orientation'),
        hasTouch: z.boolean().optional().describe('Simulate touch-enabled device')
      })
      .optional()
      .describe('Viewport configuration for the screenshot')
  })
  .optional()
  .describe('Screenshot capture options');

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot image of a website URL, raw HTML content, or Markdown using Headless Chrome. Supports full-page captures, custom viewports, mobile simulation, and delayed rendering. Returns a URL to download the generated image.`,
  instructions: [
    'Provide exactly one of: html, url, or markdown as the source content.',
    'Use viewPortOptions to simulate different devices or screen sizes.',
    'Set delay to wait for animations or dynamic content before capturing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      html: z.string().optional().describe('Raw HTML content to capture as an image'),
      url: z.string().optional().describe('Publicly accessible URL to capture as an image'),
      markdown: z.string().optional().describe('Markdown content to capture as an image'),
      fileName: z.string().optional().describe('Desired file name for the generated image'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the image opens in browser; if false, triggers download'),
      options: imageOptionsSchema,
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source URL')
    })
  )
  .output(
    z.object({
      responseId: z
        .string()
        .describe('Unique ID for this request, can be used to delete the file later'),
      fileUrl: z.string().describe('URL to download the generated screenshot image'),
      mbOut: z.number().describe('Size of the generated file in megabytes'),
      cost: z.number().describe('Cost of this API call in USD'),
      seconds: z.number().describe('Processing time in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let sourceCount = [ctx.input.html, ctx.input.url, ctx.input.markdown].filter(
      Boolean
    ).length;
    if (sourceCount !== 1) {
      throw new Error('Provide exactly one of: html, url, or markdown');
    }

    let result: any;

    if (ctx.input.html) {
      result = await client.chromeHtmlToImage({
        html: ctx.input.html,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        options: ctx.input.options
      });
    } else if (ctx.input.url) {
      result = await client.chromeUrlToImage({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        options: ctx.input.options,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else {
      result = await client.chromeMarkdownToImage({
        markdown: ctx.input.markdown!,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        options: ctx.input.options
      });
    }

    if (!result.success) {
      throw new Error(result.error || 'Screenshot capture failed');
    }

    let sourceType = ctx.input.html ? 'HTML' : ctx.input.url ? 'URL' : 'Markdown';

    return {
      output: {
        responseId: result.responseId,
        fileUrl: result.fileUrl,
        mbOut: result.mbOut,
        cost: result.cost,
        seconds: result.seconds
      },
      message: `Captured screenshot from ${sourceType} (${result.mbOut} MB, ${result.seconds}s). [Download Image](${result.fileUrl})`
    };
  })
  .build();
