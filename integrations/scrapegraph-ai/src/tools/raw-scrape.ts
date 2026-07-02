import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rawScrape = SlateTool.create(spec, {
  name: 'Fetch Raw HTML',
  key: 'raw_scrape',
  description: `Fetches and returns the raw HTML of a webpage with JavaScript rendering support. Useful when you need the complete page source rather than AI-processed output.
Optionally extracts branding information (colors, fonts, typography, UI styles, metadata).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      websiteUrl: z.string().describe('URL of the webpage to fetch'),
      branding: z
        .boolean()
        .optional()
        .describe('Extract brand design and metadata (colors, fonts, typography, UI styles)'),
      stealth: z
        .boolean()
        .optional()
        .describe('Enable anti-detection mode for protected sites (adds credits)'),
      waitMs: z
        .number()
        .optional()
        .describe('Milliseconds to wait for page load and JS rendering (default: 3000)'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO country code for proxy routing (e.g., "us", "gb")')
    })
  )
  .output(
    z.object({
      scrapeRequestId: z.string().describe('Unique identifier for this scrape request'),
      status: z.string().describe('Status of the request'),
      html: z.string().describe('Raw HTML content of the webpage'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.scrape({
      websiteUrl: ctx.input.websiteUrl,
      branding: ctx.input.branding,
      stealth: ctx.input.stealth,
      waitMs: ctx.input.waitMs,
      countryCode: ctx.input.countryCode
    });

    return {
      output: {
        scrapeRequestId: response.scrape_request_id,
        status: response.status,
        html: response.html,
        error: response.error
      },
      message: `Fetched raw HTML from **${ctx.input.websiteUrl}**. Status: **${response.status}**. HTML length: **${(response.html || '').length}** chars.`
    };
  })
  .build();
