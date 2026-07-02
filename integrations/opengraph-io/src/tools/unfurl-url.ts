import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unfurlUrl = SlateTool.create(spec, {
  name: 'Unfurl URL',
  key: 'unfurl_url',
  description: `Extract Open Graph metadata, Twitter Cards, and HTML meta tags from any URL. Returns a **hybridGraph** that merges OpenGraph tags, Twitter Card data, and inferred metadata from page content for the most complete result.

Use this to generate link previews, validate social sharing metadata, or gather structured information about a webpage.`,
  instructions: [
    'The hybridGraph field provides the best combined metadata — prefer it over raw openGraph or htmlInferred fields.',
    'Enable fullRender for JavaScript-heavy or single-page application sites.',
    'Use proxy options (useProxy, usePremium, useSuperior) for sites with bot protection.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to extract metadata from'),
      cacheOk: z
        .boolean()
        .optional()
        .describe('Allow cached results for faster responses. Defaults to true.'),
      fullRender: z
        .boolean()
        .optional()
        .describe(
          'Fully render the page using Chrome before parsing. Useful for SPAs and JS-heavy sites.'
        ),
      useProxy: z
        .boolean()
        .optional()
        .describe('Route request through a standard proxy to bypass bot detection.'),
      usePremium: z
        .boolean()
        .optional()
        .describe('Use a residential proxy for enhanced site access.'),
      useSuperior: z
        .boolean()
        .optional()
        .describe('Use a mobile proxy for the highest success rate on restrictive sites.'),
      useAi: z
        .boolean()
        .optional()
        .describe('Enable AI enhancement for better metadata extraction.'),
      maxCacheAge: z
        .number()
        .optional()
        .describe('Maximum cache age in seconds. Defaults to 432000 (5 days).'),
      acceptLang: z
        .string()
        .optional()
        .describe('Language to present to the target site, e.g. "en-US,en;q=0.9".'),
      autoProxy: z
        .boolean()
        .optional()
        .describe('Automatically select optimal proxy level (eligible plans only).'),
      proxyCountry: z.string().optional().describe('Country code for proxy routing.')
    })
  )
  .output(
    z.object({
      hybridGraph: z
        .object({
          title: z.string().optional().describe('Page title'),
          description: z.string().optional().describe('Page description'),
          image: z.string().optional().describe('Primary image URL'),
          url: z.string().optional().describe('Canonical URL'),
          siteName: z.string().optional().describe('Site name'),
          type: z.string().optional().describe('Content type (e.g. website, article)'),
          favicon: z.string().optional().describe('Favicon URL')
        })
        .optional()
        .describe(
          'Best combined metadata from OpenGraph, Twitter Cards, and inferred HTML data'
        ),
      openGraph: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          type: z.string().optional(),
          url: z.string().optional(),
          siteName: z.string().optional(),
          image: z
            .object({
              url: z.string().optional()
            })
            .optional()
        })
        .optional()
        .describe('Raw OpenGraph tags found on the page'),
      htmlInferred: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          favicon: z.string().optional()
        })
        .optional()
        .describe('Metadata inferred from HTML content'),
      requestInfo: z
        .object({
          redirects: z.number().optional(),
          host: z.string().optional(),
          responseCode: z.number().optional()
        })
        .optional()
        .describe('HTTP request metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSiteMetadata(ctx.input.url, {
      cacheOk: ctx.input.cacheOk,
      fullRender: ctx.input.fullRender,
      useProxy: ctx.input.useProxy,
      usePremium: ctx.input.usePremium,
      useSuperior: ctx.input.useSuperior,
      useAi: ctx.input.useAi,
      maxCacheAge: ctx.input.maxCacheAge,
      acceptLang: ctx.input.acceptLang,
      autoProxy: ctx.input.autoProxy,
      proxyCountry: ctx.input.proxyCountry
    });

    let hybrid = result.hybridGraph ?? {};
    let title = hybrid.title ?? result.openGraph?.title ?? 'Unknown';

    return {
      output: {
        hybridGraph: result.hybridGraph,
        openGraph: result.openGraph,
        htmlInferred: result.htmlInferred,
        requestInfo: result.requestInfo
      },
      message: `Extracted metadata for **${title}** from \`${ctx.input.url}\`. ${hybrid.description ? `Description: "${hybrid.description.substring(0, 120)}${hybrid.description.length > 120 ? '...' : ''}"` : 'No description found.'}`
    };
  });
