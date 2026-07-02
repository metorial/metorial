import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeUrl = SlateTool.create(spec, {
  name: 'Scrape URL',
  key: 'scrape_url',
  description: `Scrape content from any public URL using ZenRows' Universal Scraper API. Supports static and dynamic pages with JavaScript rendering, premium residential proxies for anti-bot bypass, geolocation targeting, CSS-based extraction, auto-parsing, and multiple output formats including HTML, Markdown, plaintext, and screenshots.`,
  instructions: [
    'Set **jsRender** to true when scraping JavaScript-heavy or single-page application sites.',
    'Enable **premiumProxy** when the target site has strict anti-bot measures. Set **proxyCountry** along with premiumProxy for geo-restricted content.',
    'Use **mode** "auto" to let ZenRows automatically determine the optimal scraping configuration.',
    'Use **cssExtractor** as a JSON string to extract specific elements, e.g. \'{"links": "a @href", "title": "h1"}\'.',
    'Use **responseType** "markdown" for LLM-friendly output.',
    'For POST/PUT requests, set **method**, **postBody**, and **postContentType** accordingly.'
  ],
  constraints: [
    'Session IDs keep the same IP for up to 10 minutes (values 1-99999).',
    'Screenshot quality only applies when screenshotFormat is "jpeg".',
    'proxyCountry requires premiumProxy to be enabled.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The target URL to scrape'),
      mode: z
        .enum(['auto'])
        .optional()
        .describe(
          'Set to "auto" to let ZenRows automatically determine the best scraping configuration'
        ),
      jsRender: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering with a headless browser for dynamic content'),
      jsInstructions: z
        .string()
        .optional()
        .describe(
          'JSON array of JavaScript instructions to execute on the page (e.g. click, fill, wait). Requires jsRender.'
        ),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use residential IPs to bypass anti-bot protection'),
      proxyCountry: z
        .string()
        .optional()
        .describe(
          'ISO country code for the proxy IP (e.g. "us", "gb", "de"). Requires premiumProxy.'
        ),
      sessionId: z
        .number()
        .optional()
        .describe(
          'Session ID (1-99999) to maintain the same IP across requests for up to 10 minutes'
        ),
      device: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for user-agent emulation. Defaults to "desktop".'),
      originalStatus: z
        .boolean()
        .optional()
        .describe('Return the original HTTP status code from the target page'),
      allowedStatusCodes: z
        .string()
        .optional()
        .describe('Comma-separated status codes to allow (e.g. "404,500")'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before returning content'),
      wait: z.number().optional().describe('Fixed wait time in milliseconds after page load'),
      blockResources: z
        .string()
        .optional()
        .describe('Comma-separated resource types to block (e.g. "image,stylesheet")'),
      jsonResponse: z
        .boolean()
        .optional()
        .describe('Capture network requests (XHR/Fetch) in JSON format'),
      cssExtractor: z
        .string()
        .optional()
        .describe(
          'JSON string defining CSS selectors for targeted extraction (e.g. \'{"title": "h1", "links": "a @href"}\')'
        ),
      autoparse: z
        .boolean()
        .optional()
        .describe('Automatically extract structured data from the page'),
      responseType: z
        .enum(['markdown', 'plaintext', 'pdf'])
        .optional()
        .describe('Output format for the scraped content'),
      screenshot: z.boolean().optional().describe('Capture an above-the-fold screenshot'),
      screenshotFullpage: z.boolean().optional().describe('Capture a full-page screenshot'),
      screenshotSelector: z
        .string()
        .optional()
        .describe('CSS selector of a specific element to screenshot'),
      screenshotFormat: z.enum(['png', 'jpeg']).optional().describe('Screenshot image format'),
      screenshotQuality: z
        .number()
        .optional()
        .describe('JPEG quality (1-100). Only applies when screenshotFormat is "jpeg".'),
      outputs: z
        .string()
        .optional()
        .describe('Comma-separated list of data categories to retrieve from scraped content'),
      method: z
        .enum(['GET', 'POST', 'PUT'])
        .optional()
        .describe('HTTP method for the request to the target URL. Defaults to "GET".'),
      postBody: z.string().optional().describe('Request body for POST/PUT requests'),
      postContentType: z
        .string()
        .optional()
        .describe('Content-Type header for POST/PUT requests')
    })
  )
  .output(
    z.object({
      statusCode: z.number().describe('HTTP status code of the response'),
      content: z
        .string()
        .describe(
          'The scraped page content (HTML, Markdown, plaintext, JSON, or base64-encoded image depending on configuration)'
        ),
      headers: z.record(z.string(), z.string()).describe('Response headers from the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scrapeUrl({
      url: ctx.input.url,
      mode: ctx.input.mode,
      jsRender: ctx.input.jsRender,
      jsInstructions: ctx.input.jsInstructions,
      premiumProxy: ctx.input.premiumProxy,
      proxyCountry: ctx.input.proxyCountry,
      sessionId: ctx.input.sessionId,
      device: ctx.input.device,
      originalStatus: ctx.input.originalStatus,
      allowedStatusCodes: ctx.input.allowedStatusCodes,
      waitFor: ctx.input.waitFor,
      wait: ctx.input.wait,
      blockResources: ctx.input.blockResources,
      jsonResponse: ctx.input.jsonResponse,
      cssExtractor: ctx.input.cssExtractor,
      autoparse: ctx.input.autoparse,
      responseType: ctx.input.responseType,
      screenshot: ctx.input.screenshot,
      screenshotFullpage: ctx.input.screenshotFullpage,
      screenshotSelector: ctx.input.screenshotSelector,
      screenshotFormat: ctx.input.screenshotFormat,
      screenshotQuality: ctx.input.screenshotQuality,
      outputs: ctx.input.outputs,
      method: ctx.input.method,
      postBody: ctx.input.postBody,
      postContentType: ctx.input.postContentType
    });

    let contentPreview =
      result.content.length > 200 ? `${result.content.substring(0, 200)}...` : result.content;

    return {
      output: result,
      message: `Scraped **${ctx.input.url}** — status **${result.statusCode}**, received ${result.content.length} characters.\n\nPreview:\n\`\`\`\n${contentPreview}\n\`\`\``
    };
  })
  .build();
