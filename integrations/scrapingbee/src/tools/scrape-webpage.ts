import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebpage = SlateTool.create(spec, {
  name: 'Scrape Webpage',
  key: 'scrape_webpage',
  description: `Scrape any web page and retrieve its HTML content. Supports JavaScript rendering for single-page applications (React, Angular, Vue.js), proxy rotation, geo-targeting, ad blocking, and custom headers/cookies.`,
  instructions: [
    'Set renderJs to true for pages that load content dynamically with JavaScript.',
    'Use premiumProxy for difficult-to-scrape websites that block standard proxies.',
    'Use countryCode to access geo-restricted content from a specific country.'
  ],
  constraints: [
    'Scraping under login credentials is strictly prohibited and may result in account suspension.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the web page to scrape'),
      renderJs: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for dynamic pages. Defaults to false.'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use premium proxies for difficult-to-scrape websites. Costs more credits.'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy (e.g., "us", "gb", "de")'),
      blockAds: z.boolean().optional().describe('Block ads on the page to speed up scraping'),
      blockResources: z
        .boolean()
        .optional()
        .describe('Block images and CSS to speed up scraping'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      wait: z
        .number()
        .optional()
        .describe('Time in milliseconds to wait after page load before returning content'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before returning content'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers to send with the request'),
      cookies: z
        .string()
        .optional()
        .describe('Cookies to send with the request in "name=value;name2=value2" format'),
      returnPageSource: z
        .boolean()
        .optional()
        .describe('Return the original page source HTML before JavaScript rendering'),
      timeout: z.number().optional().describe('Timeout in seconds for the request (max 140)')
    })
  )
  .output(
    z.object({
      content: z.string().describe('The scraped HTML content of the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scrapeWebpage({
      url: ctx.input.url,
      renderJs: ctx.input.renderJs,
      premiumProxy: ctx.input.premiumProxy,
      countryCode: ctx.input.countryCode,
      blockAds: ctx.input.blockAds,
      blockResources: ctx.input.blockResources,
      device: ctx.input.device,
      wait: ctx.input.wait,
      waitFor: ctx.input.waitFor,
      customHeaders: ctx.input.customHeaders,
      cookies: ctx.input.cookies,
      returnPageSource: ctx.input.returnPageSource,
      timeout: ctx.input.timeout
    });

    let contentStr = typeof result === 'string' ? result : JSON.stringify(result);

    return {
      output: {
        content: contentStr
      },
      message: `Successfully scraped **${ctx.input.url}**. Retrieved ${contentStr.length} characters of content.`
    };
  });
