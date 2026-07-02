import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let searchSerp = SlateTool.create(spec, {
  name: 'Search SERP',
  key: 'search_serp',
  description: `Execute a search query on major search engines (Google, Bing, Yandex, DuckDuckGo) and retrieve search engine results page (SERP) data. Supports localization, pagination, device emulation, and parsed JSON output. Handles all anti-bot measures and proxy rotation automatically.`,
  instructions: [
    'Construct the full search engine URL with query parameters (e.g., "https://www.google.com/search?q=pizza&gl=us&hl=en").',
    'Add "brd_json=1" to the URL query string to receive parsed JSON results instead of raw HTML.',
    'Use Google parameters like "gl" (country), "hl" (language), "start" (pagination offset), and "tbm" (search type: isch, shop, nws, vid).',
    'For Bing, use "cc" (country), "setLang" (language), "first" (pagination), and "count" (results per page).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zone: z.string().describe('Name of the SERP API zone configured in Bright Data.'),
      url: z
        .string()
        .describe(
          'Full search engine URL with query parameters. Example: "https://www.google.com/search?q=pizza&gl=us&hl=en&brd_json=1"'
        ),
      format: z
        .enum(['raw', 'json'])
        .default('raw')
        .describe(
          'API response format. "raw" returns the search engine page as-is, "json" returns structured data.'
        ),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted search results.')
    })
  )
  .output(
    z.object({
      content: z
        .string()
        .describe('The SERP results in the requested format (raw HTML or JSON string).'),
      statusCode: z.number().describe('HTTP status code of the response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.searchSerp({
      zone: ctx.input.zone,
      url: ctx.input.url,
      format: ctx.input.format,
      country: ctx.input.country
    });

    let contentPreview =
      result.content.length > 300 ? `${result.content.substring(0, 300)}...` : result.content;

    return {
      output: result,
      message: `SERP results fetched for **${ctx.input.url}** (status ${result.statusCode}). Content length: ${result.content.length} characters.\n\n\`\`\`\n${contentPreview}\n\`\`\``
    };
  })
  .build();
