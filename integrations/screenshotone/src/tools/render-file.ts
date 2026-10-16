import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { generatePdf } from './generate-pdf';
import { takeScreenshot } from './take-screenshot';

let imageInput = takeScreenshot.inputSchema;
let pdfInput = generatePdf.inputSchema;
if (!(imageInput instanceof z.ZodObject) || !(pdfInput instanceof z.ZodObject)) {
  throw createApiServiceError('ScreenshotOne file input schemas are unavailable.');
}

export let renderFile = SlateTool.create(spec, {
  key: 'render_file',
  name: 'Render File',
  description:
    'Capture a website or render HTML/Markdown as a downloadable image, PDF, HTML, or Markdown file. Delivers the file content from one synchronous capture, without relying on a temporary provider download URL.',
  instructions: [
    'Provide a URL, HTML, or Markdown source. Choose format=pdf for a PDF, format=html or format=markdown for extracted page content, or an image format for a screenshot.',
    'One invocation makes one capture request, which can consume provider quota. Do not also call take_screenshot or generate_pdf for the same file.',
    'Use extract_metadata or analyze_with_vision only when you need their complementary structured results. Their provider links, including extracted content links, can expire.',
    'This tool returns the primary file only. It does not download or regenerate content from temporary links, create slices, or perform additional captures.'
  ],
  tags: { readOnly: true }
})
  .input(
    imageInput.extend({
      ...pdfInput.shape,
      format: z
        .enum([
          'png',
          'jpeg',
          'jpg',
          'webp',
          'gif',
          'jp2',
          'tiff',
          'avif',
          'heif',
          'pdf',
          'html',
          'markdown'
        ])
        .optional()
        .describe(
          'File format. Provider default: jpg. HTML and Markdown extract page content.'
        ),
      includeShadowDom: z
        .boolean()
        .optional()
        .describe('Include shadow DOM content when extracting HTML'),
      storageReturnLocation: z
        .boolean()
        .optional()
        .describe('Return the provider S3 location when uploading with store=true')
    })
  )
  .output(
    z.object({
      mimeType: z.string().describe('Actual media type of the returned file'),
      size: z.number().describe('Actual file size in bytes'),
      cacheUrl: z.string().optional().describe('Temporary provider cache link when returned'),
      storeLocation: z
        .string()
        .optional()
        .describe('Provider S3 upload location when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.renderFile(ctx.input);
    await ctx.addAttachment({ type: 'content', content: result.file });
    return {
      output: {
        mimeType: result.mimeType,
        size: result.size,
        cacheUrl: result.cacheUrl,
        storeLocation: result.storeLocation
      },
      message: 'The rendered file is ready to download.'
    };
  })
  .build();
