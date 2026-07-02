import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attributeSchema = z.object({
  name: z.string().describe('Name of the data field to extract'),
  description: z
    .string()
    .describe('Natural-language description of what this field should contain'),
  type: z
    .enum(['string', 'integer', 'number', 'bool', 'list'])
    .optional()
    .describe('Expected output type for this field')
});

export let parseContentTool = SlateTool.create(spec, {
  name: 'Parse Content',
  key: 'parse_content',
  description: `Extract structured data from raw HTML or text content you already have, without fetching from a URL. Provide the content directly along with a prompt or attributes describing the data to extract.
Useful when you have pre-fetched HTML or text and want AI-powered data extraction from it.`,
  instructions: [
    'Provide either a prompt or attributes (or both) to describe the data to extract.',
    'The content parameter accepts both raw HTML and plain text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('Raw HTML or text content to extract data from'),
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
        .describe('Extraction mode. Use "precision" to look into data hidden in HTML tags')
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
    let client = new Client({ token: ctx.auth.token });

    let results = await client.parse({
      content: ctx.input.content,
      prompt: ctx.input.prompt,
      attributes: ctx.input.attributes,
      mode: ctx.input.mode
    });

    let count = Array.isArray(results) ? results.length : 0;

    return {
      output: { results: Array.isArray(results) ? results : [] },
      message: `Extracted **${count}** record(s) from the provided content`
    };
  })
  .build();
