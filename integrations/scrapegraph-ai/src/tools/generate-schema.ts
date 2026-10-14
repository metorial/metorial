import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSchema = SlateTool.create(spec, {
  name: 'Generate Extraction Schema',
  key: 'generate_schema',
  description:
    'Generate a JSON schema from a natural language description, or extend an existing schema with additional fields, using the current ScrapeGraphAI API.',
  instructions: [
    'Requires a current API key from scrapegraphai.com; keys issued for the legacy v1 API are not accepted.',
    'Pass the returned schema to extract_data to constrain the extracted result.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('Describe the fields and data types the schema should contain'),
      existingSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Existing JSON schema to extend'),
      model: z
        .string()
        .optional()
        .describe('Optional model override supported by the provider')
    })
  )
  .output(
    z.object({
      schema: z.record(z.string(), z.unknown()).describe('Generated JSON schema'),
      refinedPrompt: z
        .string()
        .optional()
        .describe('Extraction prompt refined by the provider'),
      usage: z.object({ promptTokens: z.number(), completionTokens: z.number() }).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.generateSchema(ctx.input);
    return { output: response, message: 'Generated an extraction schema.' };
  })
  .build();
