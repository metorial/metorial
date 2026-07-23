import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeUrl = SlateTool.create(spec, {
  name: 'Scrape URL',
  key: 'scrape_url',
  description: `Fetch the fully rendered content of a web page, bypassing anti-bot protections such as Cloudflare, DataDome, PerimeterX and Akamai. The page is loaded in a real browser, so JavaScript-heavy sites return their real content rather than an empty shell. Returns raw HTML by default, or AI-parsed structured JSON.`,
  instructions: [
    'Use **parsedData** to receive AI-parsed structured JSON instead of raw HTML.',
    'Use **proxyCountry** for geo-restricted or localized pages (e.g. "us", "de").',
    'Use **timeSleep** for pages whose content streams in after the initial load.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the page to fetch, including the scheme'),
      parsedData: z
        .boolean()
        .optional()
        .describe('Return AI-parsed structured JSON instead of raw HTML'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for the exit IP (e.g. "us", "de")'),
      timeSleep: z
        .number()
        .optional()
        .describe('Seconds to wait after page load before capturing the content')
    })
  )
  .output(
    z.object({
      statusCode: z.number().describe('HTTP status code returned by ScrapeUnblocker'),
      content: z.string().describe('Rendered page content: HTML, or JSON text when parsedData is set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scrapeUrl({
      url: ctx.input.url,
      parsedData: ctx.input.parsedData,
      proxyCountry: ctx.input.proxyCountry,
      timeSleep: ctx.input.timeSleep
    });

    let contentPreview =
      result.content.length > 200 ? `${result.content.substring(0, 200)}...` : result.content;

    return {
      output: result,
      message: `Scraped **${ctx.input.url}** — status **${result.statusCode}**, received ${result.content.length} characters.\n\nPreview:\n\`\`\`\n${contentPreview}\n\`\`\``
    };
  })
  .build();
