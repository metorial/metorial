import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertHtml = SlateTool.create(spec, {
  name: 'Convert HTML',
  key: 'convert_html',
  description: `Convert HTML content or a URL to images (PNG, JPEG, WebP) or PDF. Supports custom viewport sizes, full-page capture, dark mode, and various quality settings. Returns a URL to the generated file.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      html: z.string().optional().describe('HTML content to convert'),
      url: z.string().optional().describe('URL of a webpage to capture (use instead of html)'),
      type: z
        .enum(['png', 'jpeg', 'webp', 'pdf'])
        .optional()
        .describe('Output format (default: "png")'),
      quality: z.number().optional().describe('Output quality 1-100 (default: 75)'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture entire scrollable page (default: false)'),
      omitBackground: z
        .boolean()
        .optional()
        .describe('Transparent background for PNG (default: false)'),
      width: z.number().optional().describe('Viewport width in pixels (default: 1920)'),
      height: z.number().optional().describe('Viewport height in pixels (default: 1080)'),
      darkMode: z.boolean().optional().describe('Force dark mode rendering (default: false)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      fileUrl: z.string().describe('URL to the generated file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.convertHtml({
      html: ctx.input.html,
      url: ctx.input.url,
      type: ctx.input.type,
      quality: ctx.input.quality,
      fullPage: ctx.input.fullPage,
      omitBackground: ctx.input.omitBackground,
      width: ctx.input.width,
      height: ctx.input.height,
      darkMode: ctx.input.darkMode,
      returnType: 'url'
    });

    let format = ctx.input.type || 'png';
    let source = ctx.input.url ? `URL: ${ctx.input.url}` : 'provided HTML';

    return {
      output: {
        success: result.success,
        fileUrl: result.url
      },
      message: `Converted ${source} to **${format.toUpperCase()}**. File URL: ${result.url}`
    };
  })
  .build();
