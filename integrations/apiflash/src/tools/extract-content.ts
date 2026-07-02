import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Page Content',
  key: 'extract_page_content',
  description: `Extract HTML and/or text content from a webpage, along with a screenshot.
Renders the page using a full Chrome browser and returns URLs to the extracted HTML, extracted text, and the screenshot.
Useful for scraping content from JavaScript-rendered pages that require a real browser.`,
  instructions: [
    'The url must include the protocol (http:// or https://).',
    'By default, both HTML and text extraction are enabled. Set extractHtml or extractText to false to disable either.'
  ],
  constraints: [
    'Rate limited to 20 requests/second with a 400-request burst capacity.',
    'Each call counts against your API quota.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'Target webpage URL to extract content from (must include http:// or https://)'
        ),
      extractHtml: z.boolean().optional().describe('Extract the page HTML. Defaults to true'),
      extractText: z
        .boolean()
        .optional()
        .describe('Extract the page text content. Defaults to true'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before extracting content'),
      waitUntil: z
        .enum(['dom_loaded', 'page_loaded', 'network_idle'])
        .optional()
        .describe('Page load event to wait for. Defaults to network_idle'),
      delay: z
        .number()
        .min(0)
        .max(10)
        .optional()
        .describe('Additional wait time in seconds after page load (0-10)'),
      js: z.string().optional().describe('Custom JavaScript to execute before extraction'),
      headers: z
        .string()
        .optional()
        .describe('Custom HTTP headers as semicolon-separated key:value pairs'),
      cookies: z
        .string()
        .optional()
        .describe('Custom cookies as semicolon-separated key=value pairs'),
      acceptLanguage: z.string().optional().describe('Accept-Language header value'),
      userAgent: z.string().optional().describe('Custom User-Agent string'),
      proxy: z.string().optional().describe('Proxy server address'),
      fresh: z.boolean().optional().describe('Force a fresh request, bypassing cache')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().describe('URL of the captured screenshot'),
      extractedHtmlUrl: z.string().optional().describe('URL of the extracted HTML file'),
      extractedTextUrl: z.string().optional().describe('URL of the extracted text file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractContent({
      url: ctx.input.url,
      extractHtml: ctx.input.extractHtml,
      extractText: ctx.input.extractText,
      waitFor: ctx.input.waitFor,
      waitUntil: ctx.input.waitUntil,
      delay: ctx.input.delay,
      js: ctx.input.js,
      headers: ctx.input.headers,
      cookies: ctx.input.cookies,
      acceptLanguage: ctx.input.acceptLanguage,
      userAgent: ctx.input.userAgent,
      proxy: ctx.input.proxy,
      fresh: ctx.input.fresh
    });

    let parts: string[] = [];
    if (result.extractedHtml) parts.push(`[HTML](${result.extractedHtml})`);
    if (result.extractedText) parts.push(`[Text](${result.extractedText})`);
    let contentLinks = parts.length > 0 ? ` Extracted: ${parts.join(', ')}.` : '';

    return {
      output: {
        screenshotUrl: result.url,
        extractedHtmlUrl: result.extractedHtml,
        extractedTextUrl: result.extractedText
      },
      message: `Content extracted from **${ctx.input.url}**.${contentLinks}`
    };
  })
  .build();
