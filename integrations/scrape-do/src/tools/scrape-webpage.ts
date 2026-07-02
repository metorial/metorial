import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebpage = SlateTool.create(spec, {
  name: 'Scrape Webpage',
  key: 'scrape_webpage',
  description: `Scrape any public web page and return its content. Supports JavaScript rendering via headless browser, geo-targeting through specific countries or continents, device emulation, custom headers/cookies, and browser interactions like clicking and scrolling.
Use **render** to enable JavaScript execution for dynamic pages. Use **output: "markdown"** for cleaner text extraction. Use **super** for harder-to-scrape targets with residential proxies.`,
  instructions: [
    'Set render to true for JavaScript-heavy or single-page application (SPA) websites.',
    'Use geoCode for country-specific content (e.g., "us", "gb", "de").',
    'Use playWithBrowser as a JSON-encoded array of actions for browser interactions like clicking buttons before scraping.'
  ],
  constraints: [
    'Maximum timeout is 60000ms by default.',
    'playWithBrowser requires render to be true.',
    'returnJSON, showFrames, and showWebsocketRequests require render to be true.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the webpage to scrape'),
      method: z
        .enum(['GET', 'POST'])
        .optional()
        .describe('HTTP method to use for the request'),
      postBody: z.string().optional().describe('Request body for POST requests'),
      render: z
        .boolean()
        .optional()
        .describe('Enable headless browser rendering for JavaScript-heavy pages'),
      super: z
        .boolean()
        .optional()
        .describe(
          'Enable residential/mobile proxy pool for harder-to-scrape targets (costs more credits)'
        ),
      geoCode: z
        .string()
        .optional()
        .describe('ISO country code for geo-targeting (e.g., "us", "gb", "de", "jp")'),
      regionalGeoCode: z
        .string()
        .optional()
        .describe('Continent code for regional targeting (e.g., "eu", "na", "as")'),
      device: z
        .enum(['desktop', 'mobile', 'tablet'])
        .optional()
        .describe('Device type to emulate'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID to maintain the same IP across multiple requests'),
      output: z
        .enum(['raw', 'markdown'])
        .optional()
        .describe('Output format - "raw" for HTML, "markdown" for clean text'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Replace all default headers with these custom headers'),
      extraHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Add or override specific headers on top of defaults'),
      forwardHeaders: z
        .boolean()
        .optional()
        .describe('Pass your request headers through to the target website'),
      setCookies: z
        .string()
        .optional()
        .describe(
          'Cookies to send to the target website (e.g., "name1=value1; name2=value2")'
        ),
      timeout: z.number().optional().describe('Maximum request duration in milliseconds'),
      retryTimeout: z.number().optional().describe('Retry mechanism timeout in milliseconds'),
      disableRetry: z.boolean().optional().describe('Disable automatic retries on failure'),
      disableRedirection: z.boolean().optional().describe('Prevent following HTTP redirects'),
      transparentResponse: z
        .boolean()
        .optional()
        .describe('Return the unprocessed target response including original status code'),
      // Render-specific options
      waitUntil: z
        .enum(['domcontentloaded', 'networkidle0', 'networkidle2'])
        .optional()
        .describe('Page load event to wait for (requires render)'),
      customWait: z
        .number()
        .optional()
        .describe(
          'Additional wait time in milliseconds after page load (requires render, max 35000)'
        ),
      waitSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before returning (requires render)'),
      width: z
        .number()
        .optional()
        .describe('Browser viewport width in pixels (requires render)'),
      height: z
        .number()
        .optional()
        .describe('Browser viewport height in pixels (requires render)'),
      blockResources: z
        .boolean()
        .optional()
        .describe('Block CSS, images, and fonts to speed up rendering (requires render)'),
      playWithBrowser: z
        .string()
        .optional()
        .describe(
          'JSON-encoded array of browser actions to simulate (requires render). Example: [{"Action":"Click","Selector":"#btn"}]'
        ),
      returnJSON: z
        .boolean()
        .optional()
        .describe('Return all network requests as JSON (requires render)'),
      showFrames: z
        .boolean()
        .optional()
        .describe('Include iframe content in response (requires render and returnJSON)'),
      showWebsocketRequests: z
        .boolean()
        .optional()
        .describe('Include WebSocket requests in response (requires render and returnJSON)'),
      pureCookies: z
        .boolean()
        .optional()
        .describe('Retrieve original Set-Cookie headers from the target response')
    })
  )
  .output(
    z.object({
      statusCode: z.number().describe('HTTP status code from the target website'),
      content: z
        .string()
        .describe('The scraped content (HTML, markdown, or JSON depending on settings)'),
      responseHeaders: z.record(z.string(), z.string()).describe('HTTP response headers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;

    let headers: Record<string, string> | undefined;
    if (input.customHeaders) {
      headers = input.customHeaders;
    } else if (input.extraHeaders) {
      headers = input.extraHeaders;
    }

    let result = await client.scrapeUrl(
      {
        url: input.url,
        render: input.render,
        super: input.super,
        geoCode: input.geoCode,
        regionalGeoCode: input.regionalGeoCode,
        device: input.device,
        sessionId: input.sessionId,
        output: input.output,
        customHeaders: input.customHeaders ? true : undefined,
        extraHeaders: input.extraHeaders ? true : undefined,
        forwardHeaders: input.forwardHeaders,
        setCookies: input.setCookies,
        timeout: input.timeout,
        retryTimeout: input.retryTimeout,
        disableRetry: input.disableRetry,
        disableRedirection: input.disableRedirection,
        transparentResponse: input.transparentResponse,
        waitUntil: input.waitUntil,
        customWait: input.customWait,
        waitSelector: input.waitSelector,
        width: input.width,
        height: input.height,
        blockResources: input.blockResources,
        playWithBrowser: input.playWithBrowser,
        returnJSON: input.returnJSON,
        showFrames: input.showFrames,
        showWebsocketRequests: input.showWebsocketRequests,
        pureCookies: input.pureCookies
      },
      input.method || 'GET',
      input.postBody,
      headers
    );

    let contentPreview = result.body.substring(0, 200);

    return {
      output: {
        statusCode: result.statusCode,
        content: result.body,
        responseHeaders: result.headers
      },
      message: `Scraped **${input.url}** — status **${result.statusCode}**, received ${result.body.length} characters of content. Preview: \`${contentPreview}...\``
    };
  })
  .build();
