import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapingClient } from '../lib/scraping-client';
import { spec } from '../spec';

let browserActionSchema = z.object({
  type: z
    .enum([
      'click',
      'input',
      'scroll',
      'scroll_to_bottom',
      'wait',
      'wait_for_element',
      'fetch_resource'
    ])
    .describe('Type of browser action to perform'),
  selector: z
    .object({
      type: z.enum(['css', 'xpath', 'text']).describe('Selector type'),
      value: z.string().describe('Selector value')
    })
    .optional()
    .describe('Element selector for click, input, and wait_for_element actions'),
  value: z.string().optional().describe('Text to type for input actions'),
  x: z.number().optional().describe('Horizontal scroll amount in pixels'),
  y: z.number().optional().describe('Vertical scroll amount in pixels'),
  waitTimeS: z.number().optional().describe('Wait time in seconds for wait actions'),
  timeoutS: z.number().optional().describe('Timeout in seconds'),
  onError: z.enum(['error', 'skip']).optional().describe('Behavior on error'),
  filter: z.string().optional().describe('Regex filter for fetch_resource actions')
});

export let scrapeWebsite = SlateTool.create(spec, {
  name: 'Scrape Website',
  key: 'scrape_website',
  description: `Scrape a website in real-time using the Decodo Web Scraping API. Supports 30+ pre-built target templates for Amazon, Google, Bing, Walmart, Reddit, TikTok, YouTube, and more, or scrape any website with the universal target. Returns raw HTML, parsed JSON, Markdown, or screenshots. Handles proxies, JavaScript rendering, CAPTCHAs, and anti-bot protections automatically.`,
  instructions: [
    'Use the **target** parameter to select a pre-built template (e.g. "amazon_product", "google_search") or leave as "universal" for any website.',
    'For target templates that accept a search query or product ID, use the **query** parameter instead of **url**.',
    'Set **parse** to true to get structured JSON output instead of raw HTML.',
    'Set **markdown** to true to get Markdown-formatted output, useful for LLM processing.',
    'Set **headless** to "html" for JavaScript-rendered pages, or "png" for screenshots.'
  ],
  constraints: [
    'Connection timeout is 150 seconds for real-time requests.',
    'Requires Basic Auth (Web Scraping API credentials).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .optional()
        .describe('Target URL to scrape. Required unless using a target template with query.'),
      query: z
        .string()
        .optional()
        .describe(
          'Search query or product ID for target templates (e.g. ASIN for amazon_product, search terms for google_search).'
        ),
      target: z
        .enum([
          'universal',
          'amazon_url',
          'amazon_product',
          'amazon_pricing',
          'amazon_search',
          'amazon_bestsellers',
          'amazon_sellers',
          'google_url',
          'google_search',
          'google_ads',
          'google_ai_mode',
          'google_lens',
          'google_travel_hotels',
          'bing_url',
          'bing_search',
          'walmart_url',
          'walmart_product',
          'walmart_search',
          'target_url',
          'target_product',
          'target_search',
          'reddit_post',
          'reddit_subreddit',
          'reddit_user',
          'tiktok_post',
          'tiktok_shop_product',
          'tiktok_shop_search',
          'tiktok_shop_url',
          'youtube_metadata',
          'youtube_transcript',
          'youtube_subtitles',
          'youtube_channel',
          'youtube_search',
          'chatgpt',
          'perplexity'
        ])
        .default('universal')
        .describe('Target template name'),
      proxyPool: z
        .enum(['standard', 'premium'])
        .optional()
        .describe('Proxy tier: "standard" for simple pages, "premium" for anti-bot bypass'),
      headless: z
        .enum(['html', 'png'])
        .optional()
        .describe('JavaScript rendering mode: "html" for rendered HTML, "png" for screenshot'),
      parse: z
        .boolean()
        .optional()
        .describe('When true, returns structured JSON instead of raw HTML'),
      markdown: z
        .boolean()
        .optional()
        .describe('When true, returns Markdown-formatted output'),
      xhr: z
        .boolean()
        .optional()
        .describe('When true, captures XHR and fetch requests from the page'),
      geo: z
        .string()
        .optional()
        .describe('Geographic location for the request (e.g. "United States", "Germany")'),
      domain: z
        .string()
        .optional()
        .describe('TLD for search targets (e.g. "com", "co.uk", "fr")'),
      locale: z.string().optional().describe('Language/locale code (e.g. "en-US", "de-DE")'),
      deviceType: z
        .enum([
          'desktop',
          'desktop_chrome',
          'desktop_firefox',
          'mobile',
          'mobile_android',
          'mobile_ios'
        ])
        .optional()
        .describe('Device type to emulate'),
      httpMethod: z.enum(['GET', 'POST']).optional().describe('HTTP method for the request'),
      payload: z
        .string()
        .optional()
        .describe('Base64-encoded POST request body (used with httpMethod: "POST")'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom request headers to send to the target'),
      cookies: z.string().optional().describe('Custom cookies for authenticated requests'),
      sessionId: z
        .string()
        .optional()
        .describe(
          'Session ID for sticky proxy sessions (reuse same IP across multiple requests)'
        ),
      successfulStatusCodes: z
        .string()
        .optional()
        .describe('Comma-separated HTTP status codes to treat as successful (e.g. "401,404")'),
      browserActions: z
        .array(browserActionSchema)
        .optional()
        .describe(
          'Array of browser interaction instructions (click, input, scroll, wait, etc.)'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            content: z
              .any()
              .describe(
                'Scraped content - HTML string, parsed JSON object, Markdown, or base64 PNG depending on options'
              ),
            headers: z
              .record(z.string(), z.string())
              .describe('Response headers from the target'),
            cookies: z.array(z.any()).describe('Response cookies'),
            statusCode: z.number().describe('HTTP status code from the target'),
            taskId: z.string().describe('Internal task ID'),
            createdAt: z.string().describe('Task creation timestamp'),
            updatedAt: z.string().describe('Task completion timestamp')
          })
        )
        .describe('Array of scraping results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapingClient(ctx.auth.token);

    ctx.info(
      `Scraping with target="${ctx.input.target}" ${ctx.input.url ? `url="${ctx.input.url}"` : ''} ${ctx.input.query ? `query="${ctx.input.query}"` : ''}`
    );

    let result = await client.scrapeRealtime({
      url: ctx.input.url,
      query: ctx.input.query,
      target: ctx.input.target,
      proxyPool: ctx.input.proxyPool,
      headless: ctx.input.headless,
      parse: ctx.input.parse,
      markdown: ctx.input.markdown,
      xhr: ctx.input.xhr,
      geo: ctx.input.geo,
      domain: ctx.input.domain,
      locale: ctx.input.locale,
      deviceType: ctx.input.deviceType,
      httpMethod: ctx.input.httpMethod,
      payload: ctx.input.payload,
      headers: ctx.input.customHeaders,
      cookies: ctx.input.cookies,
      sessionId: ctx.input.sessionId,
      successfulStatusCodes: ctx.input.successfulStatusCodes,
      browserActions: ctx.input.browserActions
    });

    let resultCount = result.results.length;
    let statusCodes = result.results.map(r => r.statusCode).join(', ');

    return {
      output: result,
      message: `Successfully scraped **${resultCount}** result(s) using target \`${ctx.input.target}\`. Status code(s): ${statusCodes}.`
    };
  })
  .build();
