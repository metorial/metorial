import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

let chromePdfOptionsSchema = z
  .object({
    delay: z
      .number()
      .optional()
      .describe('Delay in milliseconds before rendering (useful for pages with animations)'),
    scale: z.number().optional().describe('Scale of the webpage rendering, defaults to 1'),
    displayHeaderFooter: z
      .boolean()
      .optional()
      .describe('Display header and footer in the PDF'),
    headerTemplate: z
      .string()
      .optional()
      .describe(
        'HTML template for the header. Use classes like "date", "title", "url", "pageNumber", "totalPages"'
      ),
    footerTemplate: z
      .string()
      .optional()
      .describe(
        'HTML template for the footer. Use classes like "date", "title", "url", "pageNumber", "totalPages"'
      ),
    printBackground: z
      .boolean()
      .optional()
      .describe('Print background graphics, defaults to true'),
    landscape: z.boolean().optional().describe('Use landscape orientation'),
    pageRanges: z.string().optional().describe('Page ranges to print, e.g. "1-5, 8, 11-13"'),
    width: z.string().optional().describe('Paper width with units, e.g. "8.27in"'),
    height: z.string().optional().describe('Paper height with units, e.g. "11.69in"'),
    marginTop: z.string().optional().describe('Top margin with units, e.g. ".4in"'),
    marginBottom: z.string().optional().describe('Bottom margin with units, e.g. ".4in"'),
    marginLeft: z.string().optional().describe('Left margin with units, e.g. ".4in"'),
    marginRight: z.string().optional().describe('Right margin with units, e.g. ".4in"'),
    preferCSSPageSize: z
      .boolean()
      .optional()
      .describe('Use CSS-defined page size instead of configured width/height'),
    omitBackground: z
      .boolean()
      .optional()
      .describe('Omit default white background for transparent PDFs'),
    puppeteerWaitForMethod: z
      .string()
      .optional()
      .describe('Puppeteer wait method, e.g. "waitForSelector", "waitForFunction"'),
    puppeteerWaitForValue: z
      .string()
      .optional()
      .describe('Value to pass to the Puppeteer wait method')
  })
  .optional()
  .describe('Chrome PDF rendering options');

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF document from HTML content, a publicly accessible URL, or Markdown text using Headless Chrome. Supports configurable page layout, headers/footers, margins, page size, and other Chrome PDF options. Returns a URL to download the generated PDF.`,
  instructions: [
    'Provide exactly one of: html, url, or markdown as the source content.',
    'For URLs requiring authentication, pass the necessary headers via extraHttpHeaders.',
    'Use the options object to customize page layout, margins, orientation, and header/footer templates.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      html: z.string().optional().describe('Raw HTML content to convert to PDF'),
      url: z.string().optional().describe('Publicly accessible URL to convert to PDF'),
      markdown: z.string().optional().describe('Markdown content to convert to PDF'),
      fileName: z.string().optional().describe('Desired file name for the generated PDF'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the PDF opens in browser; if false, triggers download'),
      options: chromePdfOptionsSchema,
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers to send when fetching the source URL')
    })
  )
  .output(
    z.object({
      responseId: z
        .string()
        .describe('Unique ID for this request, can be used to delete the file later'),
      fileUrl: z.string().describe('URL to download the generated PDF'),
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
      result = await client.chromeHtmlToPdf({
        html: ctx.input.html,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        options: ctx.input.options
      });
    } else if (ctx.input.url) {
      result = await client.chromeUrlToPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        options: ctx.input.options,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else {
      result = await client.chromeMarkdownToPdf({
        markdown: ctx.input.markdown!,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        options: ctx.input.options
      });
    }

    if (!result.success) {
      throw new Error(result.error || 'PDF generation failed');
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
      message: `Generated PDF from ${sourceType} (${result.mbOut} MB, ${result.seconds}s). [Download PDF](${result.fileUrl})`
    };
  })
  .build();
