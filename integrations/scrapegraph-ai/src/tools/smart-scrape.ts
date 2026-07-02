import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let smartScrape = SlateTool.create(spec, {
  name: 'Smart Scrape',
  key: 'smart_scrape',
  description: `Extracts structured data from a single webpage using AI and a natural language prompt. Provide a URL (or raw HTML/Markdown content) and describe what data you want extracted; returns structured JSON.
Supports custom output schemas for consistent data structure, infinite scroll handling, stealth mode for anti-detection, and proxy routing by country.`,
  instructions: [
    'Provide exactly one of: websiteUrl, websiteHtml, or websiteMarkdown as the content source.',
    'Use outputSchema as a JSON object to enforce a specific structure on the extracted data.',
    'Enable stealth mode for sites with bot detection (costs extra credits).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      websiteUrl: z.string().optional().describe('URL of the webpage to scrape'),
      websiteHtml: z
        .string()
        .optional()
        .describe(
          'Raw HTML content to extract data from (max 2MB, mutually exclusive with websiteUrl and websiteMarkdown)'
        ),
      websiteMarkdown: z
        .string()
        .optional()
        .describe(
          'Raw Markdown content to extract data from (max 2MB, mutually exclusive with websiteUrl and websiteHtml)'
        ),
      userPrompt: z
        .string()
        .describe('Natural language description of what data to extract from the page'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema defining the structure of the expected output'),
      plainText: z
        .boolean()
        .optional()
        .describe('Return results as plain text instead of JSON'),
      stealth: z
        .boolean()
        .optional()
        .describe('Enable anti-detection mode for protected sites (adds 4 credits)'),
      waitMs: z
        .number()
        .optional()
        .describe('Milliseconds to wait for page load (default: 3000)'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO country code for proxy routing (e.g., "us", "gb")'),
      numberOfScrolls: z
        .number()
        .optional()
        .describe('Number of infinite scroll iterations to perform before extraction')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this scraping request'),
      status: z.string().describe('Status of the request (e.g., "completed")'),
      websiteUrl: z.string().optional().describe('URL that was scraped'),
      result: z.unknown().describe('Extracted data from the webpage'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.smartScraper({
      websiteUrl: ctx.input.websiteUrl,
      websiteHtml: ctx.input.websiteHtml,
      websiteMarkdown: ctx.input.websiteMarkdown,
      userPrompt: ctx.input.userPrompt,
      outputSchema: ctx.input.outputSchema,
      plainText: ctx.input.plainText,
      stealth: ctx.input.stealth,
      waitMs: ctx.input.waitMs,
      countryCode: ctx.input.countryCode,
      numberOfScrolls: ctx.input.numberOfScrolls
    });

    return {
      output: {
        requestId: response.request_id,
        status: response.status,
        websiteUrl: response.website_url,
        result: response.result,
        error: response.error
      },
      message: `Scraped **${ctx.input.websiteUrl || 'provided content'}** with prompt: "${ctx.input.userPrompt}". Status: **${response.status}**.`
    };
  })
  .build();
