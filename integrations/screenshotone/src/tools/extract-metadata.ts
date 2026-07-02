import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractMetadata = SlateTool.create(spec, {
  name: 'Extract Page Metadata',
  key: 'extract_metadata',
  description: `Extract metadata from a web page including page title, Open Graph tags, favicon, fonts used, HTTP response status/headers, and page content as HTML or Markdown.

Use this to scrape structured information from web pages without needing to process raw screenshots. Useful for link previews, content extraction, SEO analysis, and page auditing.`,
  instructions: [
    'Provide a **url** to extract metadata from a live web page, or provide **html** content.',
    'Enable the specific metadata fields you need — all are disabled by default.',
    'Use **contentFormat** set to "markdown" to get page content as clean Markdown text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the web page to extract metadata from'),
      html: z.string().optional().describe('HTML content to extract metadata from'),

      // Metadata toggles
      pageTitle: z.boolean().optional().describe('Extract the page title. Default: false'),
      openGraph: z
        .boolean()
        .optional()
        .describe(
          'Parse Open Graph tags (og:title, og:description, og:image, etc.). Default: false'
        ),
      icon: z.boolean().optional().describe('Extract favicon data. Default: false'),
      fonts: z.boolean().optional().describe('List fonts used on the page. Default: false'),
      imageSize: z
        .boolean()
        .optional()
        .describe('Return screenshot dimensions. Default: false'),
      content: z.boolean().optional().describe('Return the full page content. Default: false'),
      contentFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Format for page content extraction. Default: html'),
      httpResponseStatusCode: z
        .boolean()
        .optional()
        .describe('Include the HTTP status code from the target site. Default: false'),
      httpResponseHeaders: z
        .boolean()
        .optional()
        .describe('Include HTTP response headers from the target site. Default: false'),

      // Page loading config
      waitUntil: z
        .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
        .optional()
        .describe('Page load event to wait for'),
      delay: z.number().optional().describe('Additional wait time in seconds'),
      timeout: z.number().optional().describe('Max request duration in seconds'),
      blockAds: z.boolean().optional().describe('Block advertisements for cleaner extraction'),
      blockCookieBanners: z.boolean().optional().describe('Block cookie banners'),

      // Request config
      userAgent: z.string().optional().describe('Custom user agent string'),
      authorization: z
        .string()
        .optional()
        .describe('HTTP Authorization header for authenticated pages'),
      cookies: z.array(z.string()).optional().describe('Cookies to set'),
      headers: z.array(z.string()).optional().describe('Custom HTTP headers'),
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
        .describe('Route through proxy in specified country')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().optional().describe('URL of the captured screenshot'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Extracted metadata including requested fields (page_title, open_graph, icon, fonts, image_size, content, http_response_status_code, http_response_headers)'
        ),
      cacheUrl: z.string().optional().describe('CDN cache URL if caching was enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.takeScreenshot({
      url: ctx.input.url,
      html: ctx.input.html,
      format: 'png',
      metadataPageTitle: ctx.input.pageTitle,
      metadataOpenGraph: ctx.input.openGraph,
      metadataIcon: ctx.input.icon,
      metadataFonts: ctx.input.fonts,
      metadataImageSize: ctx.input.imageSize,
      metadataContent: ctx.input.content,
      metadataContentFormat: ctx.input.contentFormat,
      metadataHttpResponseStatusCode: ctx.input.httpResponseStatusCode,
      metadataHttpResponseStatusHeaders: ctx.input.httpResponseHeaders,
      waitUntil: ctx.input.waitUntil,
      delay: ctx.input.delay,
      timeout: ctx.input.timeout,
      blockAds: ctx.input.blockAds,
      blockCookieBanners: ctx.input.blockCookieBanners,
      userAgent: ctx.input.userAgent,
      authorization: ctx.input.authorization,
      cookies: ctx.input.cookies,
      headers: ctx.input.headers,
      ipCountryCode: ctx.input.ipCountryCode
    });

    let source = ctx.input.url || 'provided HTML content';
    let fields: string[] = [];
    if (ctx.input.pageTitle) fields.push('page title');
    if (ctx.input.openGraph) fields.push('Open Graph tags');
    if (ctx.input.icon) fields.push('favicon');
    if (ctx.input.fonts) fields.push('fonts');
    if (ctx.input.imageSize) fields.push('image size');
    if (ctx.input.content) fields.push(`content (${ctx.input.contentFormat || 'html'})`);
    if (ctx.input.httpResponseStatusCode) fields.push('HTTP status code');
    if (ctx.input.httpResponseHeaders) fields.push('HTTP headers');

    return {
      output: {
        screenshotUrl: result.screenshotUrl,
        metadata: result.metadata,
        cacheUrl: result.cacheUrl
      },
      message: `Metadata extracted from ${source}. Fields: ${fields.length > 0 ? fields.join(', ') : 'none requested'}.`
    };
  })
  .build();
