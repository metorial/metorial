import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scrapingOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let extractFields = SlateTool.create(spec, {
  name: 'Extract Structured Fields',
  key: 'extract_fields',
  description: `Extract specific data fields from any webpage as structured JSON using AI. Define field names and natural language descriptions of what to extract, and the AI interprets the page to return the values.
Works well for product details, articles, profiles, contact info, and similar structured content.`,
  instructions: [
    'Each field requires a name (the JSON key) and a description of what to extract.',
    'Example fields: `{"price": "Current sale price with currency", "title": "Product title"}`.',
    'Descriptions should be clear and specific for best extraction accuracy.'
  ],
  constraints: ['Costs 5 API credits per request plus proxy costs.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the webpage to extract fields from.'),
      fields: z
        .record(z.string(), z.string())
        .describe(
          'A map of field names to natural language descriptions of what to extract. Example: {"price": "Current sale price with currency", "title": "Product title"}'
        ),
      ...scrapingOptionsSchema
    })
  )
  .output(
    z.object({
      extractedFields: z
        .record(z.string(), z.any())
        .describe(
          'The extracted field values as a JSON object matching the requested field names.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let extractedFields = await client.extractFields({
      url: ctx.input.url,
      fields: ctx.input.fields,
      js: ctx.input.js,
      jsTimeout: ctx.input.jsTimeout,
      timeout: ctx.input.timeout,
      waitFor: ctx.input.waitFor,
      proxy: ctx.input.proxy,
      country: ctx.input.country,
      device: ctx.input.device,
      headers: ctx.input.headers,
      jsScript: ctx.input.jsScript,
      customProxy: ctx.input.customProxy,
      errorOn404: ctx.input.errorOn404,
      errorOnRedirect: ctx.input.errorOnRedirect
    });

    let fieldNames = Object.keys(ctx.input.fields);
    return {
      output: { extractedFields },
      message: `Successfully extracted ${fieldNames.length} field(s) from **${ctx.input.url}**: ${fieldNames.join(', ')}.`
    };
  })
  .build();
