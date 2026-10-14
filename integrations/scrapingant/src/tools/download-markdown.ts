import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadMarkdown = SlateTool.create(spec, {
  name: 'Download Markdown',
  key: 'download_markdown',
  description:
    'Scrape a web page and save its converted content as a downloadable Markdown file for archiving or a document-processing workflow.',
  instructions: [
    'Provide jsSnippet as plain JavaScript; it is encoded automatically.',
    'Use scrape_extended when you need to inspect the target page status. Markdown conversion can succeed for target error pages.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('HTTP or HTTPS URL of the page to convert to Markdown.'),
      filename: z
        .string()
        .min(1)
        .optional()
        .describe('Download filename. Defaults to webpage.md.'),
      browser: z.boolean().optional().describe('Enable browser rendering. Defaults to true.'),
      timeout: z
        .number()
        .min(5)
        .max(60)
        .optional()
        .describe('Maximum scraping time in seconds, from 5 to 60.'),
      proxyType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('Proxy type. Defaults to datacenter.'),
      proxyCountry: z.string().optional().describe('Two-letter country code for the proxy.'),
      cookies: z
        .string()
        .optional()
        .describe('Cookies to send to the target page, in name=value;name=value format.'),
      jsSnippet: z
        .string()
        .optional()
        .describe('Plain JavaScript to execute before conversion. Requires browser=true.'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before conversion. Requires browser=true.'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Headers to forward to the target page, without the ant- prefix.')
    })
  )
  .output(
    z.object({
      url: z.string().describe('URL returned by the Markdown conversion.'),
      filename: z.string().describe('Name of the downloadable file.'),
      mimeType: z.string().describe('MIME type of the file.'),
      sizeBytes: z.number().describe('UTF-8 file size in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.scrapeMarkdown({
      url: ctx.input.url,
      browser: ctx.input.browser,
      timeout: ctx.input.timeout,
      proxyType: ctx.input.proxyType,
      proxyCountry: ctx.input.proxyCountry,
      cookies: ctx.input.cookies,
      jsSnippet: ctx.input.jsSnippet
        ? Buffer.from(ctx.input.jsSnippet).toString('base64')
        : undefined,
      waitForSelector: ctx.input.waitForSelector,
      customHeaders: ctx.input.customHeaders
    });
    let filename = ctx.input.filename ?? 'webpage.md';
    let mimeType = 'text/markdown';
    await ctx.addAttachment({
      type: 'content',
      content: new Response(result.markdown, {
        headers: { 'content-type': `${mimeType}; charset=utf-8` }
      }),
      filename,
      mimeType
    });

    return {
      output: {
        url: result.url,
        filename,
        mimeType,
        sizeBytes: Buffer.byteLength(result.markdown, 'utf8')
      },
      message: `Prepared **${filename}** for download.`
    };
  })
  .build();
