import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attributeSchema, cookieSchema, validateExtraction } from '../lib/schemas';
import { spec } from '../spec';

export let extractDataTool = SlateTool.create(spec, {
  name: 'Extract Data from URL',
  key: 'extract_data',
  description: `Extract structured data from any web page using AI. Provide a URL and describe the data you want using either a natural-language prompt or a list of named attributes with descriptions.
Supports **precision mode** for extracting data hidden in HTML tags and **proxy configuration** for geo-restricted pages.`,
  instructions: [
    'Provide either a prompt or attributes (or both) to describe the data to extract.',
    'Use precision mode if standard extraction misses some data.',
    'Set proxyCountry if the page may be geo-restricted.'
  ],
  constraints: ['At least one of prompt or attributes must be provided.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to extract data from'),
      prompt: z
        .string()
        .optional()
        .describe('Natural-language prompt describing the data to extract'),
      attributes: z
        .array(attributeSchema)
        .optional()
        .describe('List of named data fields to extract with descriptions'),
      mode: z
        .enum(['standard', 'precision'])
        .optional()
        .describe('Extraction mode. Use "precision" to look into data hidden in HTML tags'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Geographic location for proxy routing, e.g. "UnitedStates"'),
      cookies: z
        .array(cookieSchema)
        .optional()
        .describe('Cookies to send with the request for authenticated or session-based pages')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of extracted data records')
    })
  )
  .handleInvocation(async ctx => {
    validateExtraction(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let results = await client.extract({
      url: ctx.input.url,
      prompt: ctx.input.prompt,
      attributes: ctx.input.attributes,
      mode: ctx.input.mode,
      proxyCountry: ctx.input.proxyCountry,
      cookies: ctx.input.cookies
    });

    let count = results.length;

    return {
      output: { results },
      message: `Extracted **${count}** record(s) from ${ctx.input.url}`
    };
  })
  .build();
