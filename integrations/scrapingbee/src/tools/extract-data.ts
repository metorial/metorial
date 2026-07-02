import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractData = SlateTool.create(spec, {
  name: 'Extract Structured Data',
  key: 'extract_data',
  description: `Extract structured data from a web page using CSS selectors or XPath expressions. Returns JSON data without needing to parse HTML yourself. Supports extracting text, attributes, HTML, tables, and lists of elements.`,
  instructions: [
    'Each extraction rule maps a key name to a CSS selector or extraction config object.',
    'Simple form: `{ "title": "h1" }` extracts text content of the h1 element.',
    'Object form: `{ "title": { "selector": "h1", "type": "text" } }` with optional type (text, html, attribute).',
    'List extraction: `{ "links": { "selector": "a.item", "type": "list", "output": { "text": "span", "href": { "selector": "a", "output": "@href" } } } }`.',
    'Table extraction: `{ "table": { "selector": "table", "type": "table" } }` returns rows as arrays or objects.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the web page to extract data from'),
      extractionRules: z
        .record(z.string(), z.any())
        .describe(
          'Extraction rules mapping field names to CSS selectors or extraction config objects'
        ),
      renderJs: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for dynamic pages'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use premium proxies for difficult-to-scrape websites'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      wait: z.number().optional().describe('Time in milliseconds to wait after page load'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before extracting data')
    })
  )
  .output(
    z.object({
      extractedData: z
        .record(z.string(), z.any())
        .describe(
          'The extracted data as a JSON object with field names matching the extraction rules'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractData({
      url: ctx.input.url,
      extractionRules: ctx.input.extractionRules,
      renderJs: ctx.input.renderJs,
      premiumProxy: ctx.input.premiumProxy,
      countryCode: ctx.input.countryCode,
      device: ctx.input.device,
      wait: ctx.input.wait,
      waitFor: ctx.input.waitFor
    });

    let extractedData = typeof result === 'string' ? JSON.parse(result) : result;

    return {
      output: {
        extractedData
      },
      message: `Successfully extracted structured data from **${ctx.input.url}** with ${Object.keys(ctx.input.extractionRules).length} extraction rules.`
    };
  });
