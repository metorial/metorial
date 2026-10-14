import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertHtml = SlateTool.create(spec, {
  name: 'Convert HTML',
  key: 'convert_html',
  description: `Convert HTML content or a URL to images (PNG, JPEG, WebP) or PDF. Supports custom viewport sizes, full-page capture, dark mode, and various quality settings. Returns a downloadable file and its provider URL.`,
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
      darkMode: z.boolean().optional().describe('Force dark mode rendering (default: false)'),
      scale: z.number().optional().describe('Device scale factor, at least 1'),
      sizePreset: z
        .string()
        .optional()
        .describe('Named screen size preset, such as FHD or 4K UHD'),
      isMobile: z.boolean().optional().describe('Emulate a mobile viewport'),
      pdfPrintBackground: z
        .boolean()
        .optional()
        .describe('Include background graphics in PDF output'),
      pdfPageRange: z.string().optional().describe('PDF pages to print, for example 1-5, 8')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      rawResponse: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional result details'),
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
      scale: ctx.input.scale,
      sizePreset: ctx.input.sizePreset,
      isMobile: ctx.input.isMobile,
      pdfPrintBackground: ctx.input.pdfPrintBackground,
      pdfPageRange: ctx.input.pdfPageRange,
      returnType: 'url'
    });

    let format = ctx.input.type || 'png';
    let source = ctx.input.url ? `URL: ${ctx.input.url}` : 'provided HTML';
    let mimeType = format === 'pdf' ? 'application/pdf' : `image/${format}`;
    await ctx.addAttachment(
      await client.prepareGeneratedDownload(result.url, {
        filename: `converted-page.${format}`,
        mimeType
      })
    );

    return {
      output: {
        success: result.success,
        rawResponse: result,
        fileUrl: result.url
      },
      message: `Converted ${source} to **${format.toUpperCase()}**. File URL: ${result.url}`
    };
  })
  .build();
