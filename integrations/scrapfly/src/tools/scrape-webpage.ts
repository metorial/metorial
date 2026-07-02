import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebpage = SlateTool.create(spec, {
  name: 'Scrape Webpage',
  key: 'scrape_webpage',
  description: `Scrape any web page and retrieve its content. Supports JavaScript rendering for dynamic pages, anti-bot bypass (ASP), proxy rotation across 120+ countries, and multiple output formats (raw HTML, clean HTML, JSON, markdown, text). Can also perform inline data extraction using AI models, LLM prompts, or custom templates during the scrape.`,
  instructions: [
    'Set **renderJs** to true for JavaScript-heavy pages (SPAs, dynamic content).',
    'Enable **asp** to bypass anti-bot protection systems like CAPTCHAs and Cloudflare.',
    'Use **format** to control output: "markdown" for readable text, "clean_html" for simplified HTML, "json" for structured data.',
    'Use **js** for base64-encoded JavaScript to execute on the page, or **jsScenario** for multi-step browser automation.',
    'Combine scraping with extraction by providing **extractionPrompt**, **extractionModel**, or **extractionTemplate**.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Target URL to scrape. Must be a valid HTTP/HTTPS URL.'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'HEAD'])
        .optional()
        .describe('HTTP method for the request.'),
      body: z.string().optional().describe('Request body for POST/PUT/PATCH requests.'),
      format: z
        .enum(['raw', 'clean_html', 'json', 'markdown', 'text'])
        .optional()
        .describe('Output content format.'),
      country: z
        .string()
        .optional()
        .describe(
          'Proxy country code (ISO 3166-1 alpha-2). Supports exclusions (-gb) and weighted distribution (us:10,gb:5).'
        ),
      proxyPool: z
        .enum(['public_datacenter_pool', 'public_residential_pool'])
        .optional()
        .describe('Proxy pool to use.'),
      asp: z
        .boolean()
        .optional()
        .describe('Enable Anti-Scraping Protection to bypass CAPTCHAs, Cloudflare, etc.'),
      renderJs: z
        .boolean()
        .optional()
        .describe('Enable headless browser rendering for JavaScript-powered pages.'),
      renderingWait: z
        .number()
        .optional()
        .describe('Delay in milliseconds to wait after page load when using render_js.'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector or XPath to wait for before capturing content.'),
      js: z
        .string()
        .optional()
        .describe('Base64-encoded JavaScript to execute on the page (max 16KB).'),
      jsScenario: z
        .string()
        .optional()
        .describe('Base64-encoded JSON scenario for browser automation steps.'),
      autoScroll: z
        .boolean()
        .optional()
        .describe('Auto-scroll the page to trigger lazy-loaded content.'),
      timeout: z.number().optional().describe('Request timeout in milliseconds.'),
      session: z
        .string()
        .optional()
        .describe('Session name to persist cookies and proxy between requests.'),
      cache: z.boolean().optional().describe('Enable server-side caching of scrape results.'),
      cacheTtl: z
        .number()
        .optional()
        .describe('Cache time-to-live in seconds (default 86400).'),
      lang: z.string().optional().describe('Page language (sets Accept-Language header).'),
      os: z
        .enum(['win11', 'mac', 'linux'])
        .optional()
        .describe('Operating system to emulate.'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers to pass with the request.'),
      costBudget: z.number().optional().describe('Maximum API credit budget per scrape.'),
      extractionPrompt: z
        .string()
        .optional()
        .describe('LLM prompt to extract data from the scraped content.'),
      extractionModel: z
        .enum(['product', 'article', 'review_list', 'real_estate_listing'])
        .optional()
        .describe('AI auto-extraction model for common data types.'),
      extractionTemplate: z
        .string()
        .optional()
        .describe('Extraction template name or ephemeral template definition.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for grouping and filtering scrapes in the dashboard.'),
      correlationId: z
        .string()
        .optional()
        .describe('Custom correlation ID for grouping related scrapes.'),
      debug: z
        .boolean()
        .optional()
        .describe('Enable debug mode to store results and take screenshots.')
    })
  )
  .output(
    z.object({
      statusCode: z.number().optional().describe('HTTP status code from the target website.'),
      content: z.string().optional().describe('Scraped page content in the requested format.'),
      extractedData: z
        .any()
        .optional()
        .describe('Extracted structured data if extraction was requested.'),
      url: z.string().optional().describe('Final URL after any redirects.'),
      format: z.string().optional().describe('Content format of the response.'),
      cost: z.number().optional().describe('API credits consumed by this scrape.'),
      requestConfig: z.any().optional().describe('Echo of the request configuration used.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.scrape({
      url: ctx.input.url,
      method: ctx.input.method,
      body: ctx.input.body,
      format: ctx.input.format,
      country: ctx.input.country,
      proxyPool: ctx.input.proxyPool,
      asp: ctx.input.asp,
      renderJs: ctx.input.renderJs,
      renderingWait: ctx.input.renderingWait,
      waitForSelector: ctx.input.waitForSelector,
      js: ctx.input.js,
      jsScenario: ctx.input.jsScenario,
      autoScroll: ctx.input.autoScroll,
      timeout: ctx.input.timeout,
      session: ctx.input.session,
      cache: ctx.input.cache,
      cacheTtl: ctx.input.cacheTtl,
      lang: ctx.input.lang,
      os: ctx.input.os,
      customHeaders: ctx.input.customHeaders,
      costBudget: ctx.input.costBudget,
      extractionPrompt: ctx.input.extractionPrompt,
      extractionModel: ctx.input.extractionModel,
      extractionTemplate: ctx.input.extractionTemplate,
      tags: ctx.input.tags,
      correlationId: ctx.input.correlationId,
      debug: ctx.input.debug
    });

    let scrapeResult = result?.result ?? {};
    let scrapeConfig = result?.config ?? {};

    return {
      output: {
        statusCode: scrapeResult.status_code,
        content: scrapeResult.content,
        extractedData: scrapeResult.extracted_data,
        url: scrapeConfig.url ?? ctx.input.url,
        format: scrapeResult.format,
        cost: result?.context?.cost,
        requestConfig: scrapeConfig
      },
      message: `Scraped **${ctx.input.url}** - HTTP ${scrapeResult.status_code ?? 'unknown'}. Format: ${ctx.input.format ?? 'raw'}.${scrapeResult.extracted_data ? ' Data extraction included.' : ''}`
    };
  })
  .build();
