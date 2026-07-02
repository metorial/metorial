import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let customDataEnrichment = SlateTool.create(spec, {
  name: 'Custom Data Enrichment',
  key: 'custom_data_enrichment',
  description: `Use AI to retrieve and structure custom data on any topic. Define a topic, a lookup value, and a list of desired output fields, and receive structured JSON.

For example, look up "IBM" with topic "detailed information about companies" and output fields like "headquarters", "ceo", "revenue" to get structured company data.

This is a **premium API** that consumes multiple credits per call.`,
  instructions: [
    'Provide a descriptive topic to guide the AI (e.g., "detailed information about companies").',
    'List all desired output field names as an array of strings.',
    'Optionally choose an AI model: "default", "model-a", "model-x", or "model-a-premium".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      topic: z
        .string()
        .describe(
          'Description of the data domain (e.g., "detailed information about companies")'
        ),
      lookup: z.string().describe('The value to look up (e.g., "IBM")'),
      outputFields: z
        .array(z.string())
        .describe(
          'List of desired output field names (e.g., ["headquarters", "ceo", "revenue"])'
        ),
      model: z
        .enum(['default', 'model-a', 'model-x', 'model-a-premium'])
        .optional()
        .describe('AI model to use')
    })
  )
  .output(
    z.object({
      enrichedData: z
        .record(z.string(), z.any())
        .describe('The AI-generated structured data with requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getCustomEnrichment(
      ctx.input.topic,
      ctx.input.lookup,
      ctx.input.outputFields,
      ctx.input.model
    );

    return {
      output: {
        enrichedData: result
      },
      message: `Enriched data for "${ctx.input.lookup}" with fields: ${ctx.input.outputFields.join(', ')}`
    };
  })
  .build();
