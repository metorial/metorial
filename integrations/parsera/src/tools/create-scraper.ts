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

let cookieSchema = z.object({
  name: z.string().describe('Cookie name'),
  value: z.string().describe('Cookie value'),
  domain: z.string().optional().describe('Cookie domain'),
  path: z.string().optional().describe('Cookie path')
});

export let createScraperTool = SlateTool.create(spec, {
  name: 'Create Scraper',
  key: 'create_scraper',
  description: `Create a new reusable scraper and generate its extraction code in one step. Provide a sample URL (or raw content) and the attributes to extract. The scraper can then be run on multiple URLs with the **Run Scraper** tool.
Ideal for scenarios where the same type of data needs to be extracted from many pages with a similar structure.`,
  instructions: [
    'Provide either a sampleUrl or sampleContent for code generation.',
    'After creation, use the Run Scraper tool to execute the scraper on target URLs.',
    'To use code mode (faster, deterministic extraction), switch the scraper to code mode in the Parsera UI after creation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sampleUrl: z.string().optional().describe('A sample URL to generate the scraper from'),
      sampleContent: z
        .string()
        .optional()
        .describe(
          'Raw HTML or text content to generate the scraper from, as an alternative to sampleUrl'
        ),
      prompt: z.string().optional().describe('Additional instructions for scraper generation'),
      attributes: z
        .array(attributeSchema)
        .describe('List of named data fields the scraper should extract'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Geographic location for proxy routing during generation'),
      cookies: z
        .array(cookieSchema)
        .optional()
        .describe('Cookies for accessing the sample page')
    })
  )
  .output(
    z.object({
      scraperId: z.string().describe('Unique identifier for the created scraper'),
      generationMessage: z.string().describe('Confirmation message from code generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Creating new scraper...');
    let scraperId = await client.createScraper();

    ctx.info(`Scraper created with ID: ${scraperId}. Generating extraction code...`);
    let generationMessage = await client.generateScraper({
      scraperId,
      url: ctx.input.sampleUrl,
      content: ctx.input.sampleContent,
      prompt: ctx.input.prompt,
      attributes: ctx.input.attributes,
      proxyCountry: ctx.input.proxyCountry,
      cookies: ctx.input.cookies
    });

    return {
      output: { scraperId, generationMessage },
      message: `Created scraper **${scraperId}** and generated extraction code. ${generationMessage}`
    };
  })
  .build();
