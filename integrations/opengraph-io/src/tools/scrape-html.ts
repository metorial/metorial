import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeHtml = SlateTool.create(spec, {
  name: 'Scrape HTML',
  key: 'scrape_html',
  description: `Fetch the raw HTML content of any public webpage. Handles anti-bot protections, JavaScript rendering, and complex site structures.

Use this to retrieve full page HTML for parsing, content analysis, or data extraction workflows.`,
  instructions: [
    'Enable fullRender to capture content from JavaScript-heavy sites and single-page applications.',
    'Use proxy options for sites that block automated requests.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to scrape HTML from'),
      cacheOk: z
        .boolean()
        .optional()
        .describe('Allow cached results for faster responses. Defaults to true.'),
      fullRender: z
        .boolean()
        .optional()
        .describe(
          'Fully render the page using Chrome before returning HTML. Needed for JS-heavy sites.'
        ),
      useProxy: z.boolean().optional().describe('Route request through a standard proxy.'),
      usePremium: z
        .boolean()
        .optional()
        .describe('Use a residential proxy for enhanced access.'),
      useSuperior: z
        .boolean()
        .optional()
        .describe('Use a mobile proxy for highest success rate.'),
      acceptLang: z.string().optional().describe('Language to present to the target site.')
    })
  )
  .output(
    z.object({
      htmlContent: z.string().describe('Raw HTML content of the page'),
      requestInfo: z
        .object({
          redirects: z.number().optional(),
          host: z.string().optional(),
          responseCode: z.number().optional(),
          responseContentType: z.string().optional()
        })
        .optional()
        .describe('HTTP request metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scrapeHtml(ctx.input.url, {
      cacheOk: ctx.input.cacheOk,
      fullRender: ctx.input.fullRender,
      useProxy: ctx.input.useProxy,
      usePremium: ctx.input.usePremium,
      useSuperior: ctx.input.useSuperior,
      acceptLang: ctx.input.acceptLang
    });

    let contentLength = result.htmlContent?.length ?? 0;
    let host = result.requestInfo?.host ?? ctx.input.url;

    return {
      output: {
        htmlContent: result.htmlContent,
        requestInfo: result.requestInfo
      },
      message: `Scraped HTML from \`${host}\` — **${contentLength.toLocaleString()}** characters of HTML content retrieved.`
    };
  });
