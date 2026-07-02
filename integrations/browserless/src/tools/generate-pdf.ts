import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF from a web page or raw HTML. Navigate to a URL or render provided HTML in a headless browser and export it as a PDF. Supports page formatting options including paper size, margins, headers/footers, background printing, and landscape orientation. Returns the PDF as a base64-encoded string.`,
  instructions: [
    'Provide either a URL or raw HTML, but not both.',
    'The returned PDF is base64-encoded.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the page to convert to PDF'),
      html: z.string().optional().describe('Raw HTML content to render as PDF'),
      printBackground: z.boolean().optional().describe('Include background colors and images'),
      format: z
        .enum([
          'Letter',
          'Legal',
          'Tabloid',
          'Ledger',
          'A0',
          'A1',
          'A2',
          'A3',
          'A4',
          'A5',
          'A6'
        ])
        .optional()
        .describe('Paper format'),
      landscape: z.boolean().optional().describe('Use landscape orientation'),
      scale: z.number().optional().describe('Scale of the webpage rendering (0.1 to 2.0)'),
      displayHeaderFooter: z.boolean().optional().describe('Display header and footer'),
      headerTemplate: z.string().optional().describe('HTML template for the header'),
      footerTemplate: z.string().optional().describe('HTML template for the footer'),
      pageRanges: z.string().optional().describe('Page ranges to print, e.g. "1-5, 8"'),
      width: z.string().optional().describe('Custom page width (e.g., "8.5in")'),
      height: z.string().optional().describe('Custom page height (e.g., "11in")'),
      marginTop: z.string().optional().describe('Top margin (e.g., "1cm")'),
      marginBottom: z.string().optional().describe('Bottom margin'),
      marginLeft: z.string().optional().describe('Left margin'),
      marginRight: z.string().optional().describe('Right margin'),
      emulateMediaType: z
        .enum(['screen', 'print'])
        .optional()
        .describe('Emulate media type for CSS media queries'),
      gotoOptions: z
        .object({
          waitUntil: z
            .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
            .optional(),
          timeout: z.number().optional()
        })
        .optional()
        .describe('Navigation options'),
      waitForSelector: z
        .object({
          selector: z.string(),
          timeout: z.number().optional()
        })
        .optional()
        .describe('Wait for a CSS selector before generating the PDF'),
      waitForTimeout: z.number().optional().describe('Wait a fixed number of milliseconds'),
      bestAttempt: z.boolean().optional().describe('Proceed even when async events fail')
    })
  )
  .output(
    z.object({
      pdfBase64: z.string().describe('Base64-encoded PDF content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let input = ctx.input;
    let pdfBase64 = await client.generatePdf({
      url: input.url,
      html: input.html,
      emulateMediaType: input.emulateMediaType,
      gotoOptions: input.gotoOptions,
      waitForSelector: input.waitForSelector,
      waitForTimeout: input.waitForTimeout,
      bestAttempt: input.bestAttempt,
      options: {
        printBackground: input.printBackground,
        format: input.format,
        landscape: input.landscape,
        scale: input.scale,
        displayHeaderFooter: input.displayHeaderFooter,
        headerTemplate: input.headerTemplate,
        footerTemplate: input.footerTemplate,
        pageRanges: input.pageRanges,
        width: input.width,
        height: input.height,
        marginTop: input.marginTop,
        marginBottom: input.marginBottom,
        marginLeft: input.marginLeft,
        marginRight: input.marginRight
      }
    });

    let source = input.url ?? 'provided HTML';

    return {
      output: { pdfBase64 },
      message: `Generated PDF from ${source}. The PDF is base64-encoded (${pdfBase64.length} characters).`
    };
  })
  .build();
