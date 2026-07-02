import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Render a web page (by URL), HTML, or Markdown content as a PDF document. Returns a URL to the generated PDF.

Supports configurable paper size, orientation, margins, background printing, and single-page fitting. Includes all page customization features such as content blocking, script injection, dark mode, and device emulation.`,
  instructions: [
    'Exactly one of **url**, **html**, or **markdown** must be provided.',
    'Default paper format is "letter". Use **pdfPaperFormat** to change it.',
    'Set **pdfPrintBackground** to true to include background colors and graphics.',
    'Use **pdfFitOnePage** to fit all content onto a single PDF page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      // Source
      url: z.string().optional().describe('URL of the web page to render as PDF'),
      html: z.string().optional().describe('HTML content to render as PDF'),
      markdown: z.string().optional().describe('Markdown content to render as PDF'),

      // PDF options
      pdfPrintBackground: z
        .boolean()
        .optional()
        .describe('Include background colors and graphics. Default: false'),
      pdfFitOnePage: z
        .boolean()
        .optional()
        .describe('Fit all content onto a single page. Default: false'),
      pdfLandscape: z
        .boolean()
        .optional()
        .describe('Use landscape orientation. Default: false (portrait)'),
      pdfPaperFormat: z
        .enum(['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'legal', 'letter', 'tabloid'])
        .optional()
        .describe('Paper size. Default: letter'),
      pdfMargin: z.string().optional().describe('Uniform margin for all sides (e.g., "20px")'),
      pdfMarginTop: z.string().optional().describe('Top margin'),
      pdfMarginRight: z.string().optional().describe('Right margin'),
      pdfMarginBottom: z.string().optional().describe('Bottom margin'),
      pdfMarginLeft: z.string().optional().describe('Left margin'),

      // Viewport & device
      viewportWidth: z.number().optional().describe('Browser viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Browser viewport height in pixels'),
      viewportDevice: z.string().optional().describe('Device preset for emulation'),
      deviceScaleFactor: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Device pixel ratio (1-5)'),

      // Blocking
      blockAds: z.boolean().optional().describe('Block advertisements'),
      blockCookieBanners: z.boolean().optional().describe('Block cookie/GDPR consent banners'),
      blockChats: z.boolean().optional().describe('Block chat widgets'),
      blockTrackers: z.boolean().optional().describe('Disable analytics trackers'),

      // Content customization
      hideSelectors: z
        .array(z.string())
        .optional()
        .describe('CSS selectors of elements to hide'),
      scripts: z.string().optional().describe('JavaScript to inject and execute on the page'),
      styles: z.string().optional().describe('CSS to inject on the page'),
      click: z.string().optional().describe('CSS selector of element to click before capture'),

      // Visual emulation
      darkMode: z.boolean().optional().describe('Render in dark mode'),
      mediaType: z.enum(['print', 'screen']).optional().describe('Media type for rendering'),

      // Request config
      ipCountryCode: z
        .enum([
          'us',
          'gb',
          'de',
          'it',
          'fr',
          'cn',
          'ca',
          'es',
          'jp',
          'kr',
          'in',
          'au',
          'br',
          'mx',
          'nz',
          'pe',
          'is',
          'ie'
        ])
        .optional()
        .describe('Route through proxy in specified country'),
      userAgent: z.string().optional().describe('Custom user agent string'),
      authorization: z
        .string()
        .optional()
        .describe('HTTP Authorization header for authenticated pages'),
      cookies: z.array(z.string()).optional().describe('Cookies to set'),
      headers: z.array(z.string()).optional().describe('Custom HTTP headers'),
      timeZone: z.string().optional().describe('Timezone for rendering'),

      // Timing
      waitUntil: z
        .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
        .optional()
        .describe('Page load event to wait for'),
      delay: z.number().optional().describe('Additional wait time in seconds before capture'),
      timeout: z.number().optional().describe('Max request duration in seconds'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before capture'),

      // Caching
      cache: z.boolean().optional().describe('Enable CDN caching for this PDF'),
      cacheTtl: z.number().optional().describe('Cache TTL in seconds'),

      // S3 Storage
      store: z.boolean().optional().describe('Upload PDF to S3 storage'),
      storagePath: z.string().optional().describe('S3 object key/path'),
      storageBucket: z.string().optional().describe('Override default S3 bucket name'),

      // Error handling
      ignoreHostErrors: z
        .boolean()
        .optional()
        .describe('Continue despite HTTP errors from target site')
    })
  )
  .output(
    z.object({
      pdfUrl: z.string().optional().describe('URL of the generated PDF'),
      storeLocation: z.string().optional().describe('S3 storage location if uploaded'),
      cacheUrl: z.string().optional().describe('Direct CDN cache URL for the PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.takeScreenshot({
      ...ctx.input,
      format: 'pdf'
    });

    let source = ctx.input.url
      ? `URL \`${ctx.input.url}\``
      : ctx.input.html
        ? 'HTML content'
        : 'Markdown content';

    let paperFormat = ctx.input.pdfPaperFormat || 'letter';
    let orientation = ctx.input.pdfLandscape ? 'landscape' : 'portrait';

    return {
      output: {
        pdfUrl: result.screenshotUrl,
        storeLocation: result.storeLocation,
        cacheUrl: result.cacheUrl
      },
      message: `PDF generated from ${source} (${paperFormat}, ${orientation}).${result.screenshotUrl ? ` [View PDF](${result.screenshotUrl})` : ''}${result.storeLocation ? ` Uploaded to S3: \`${result.storeLocation}\`` : ''}`
    };
  })
  .build();
