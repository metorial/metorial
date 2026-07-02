import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractProperties = SlateTool.create(spec, {
  name: 'Extract Properties',
  key: 'extract_properties',
  description: `Extract metadata properties from all documents in a DocSet using GenAI. Properties are key-value pairs extracted by an LLM based on a user-defined schema.

Define the properties to extract including name, type, description, and optional defaults. The LLM will analyze each document and extract the requested values.`,
  instructions: [
    'Define each property with a descriptive name and clear description to guide the LLM extraction.',
    'Use fieldType "String", "Number", or "Boolean" for each property.',
    'Provide a defaultValue for cases where the LLM cannot find the information.',
    'This operation runs as a background job and may take time for large DocSets.'
  ],
  constraints: [
    'Up to 100 properties can be extracted at once via the API.',
    'Only available for Pay-As-You-Go accounts.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to extract properties from'),
      properties: z
        .array(
          z.object({
            name: z.string().describe('Property name (used as the key)'),
            fieldType: z
              .enum(['String', 'Number', 'Boolean'])
              .describe('Data type of the property'),
            description: z
              .string()
              .optional()
              .describe('Description to guide the LLM on what to extract'),
            defaultValue: z.string().optional().describe('Default value if extraction fails'),
            examples: z
              .array(z.string())
              .optional()
              .describe('Example values to guide extraction')
          })
        )
        .describe('Properties to extract from documents')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Extraction job result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.info(
      `Extracting ${ctx.input.properties.length} properties from DocSet ${ctx.input.docsetId}`
    );

    let schema = {
      properties: ctx.input.properties.map(p => ({
        name: p.name,
        field_type: p.fieldType,
        description: p.description,
        default: p.defaultValue,
        examples: p.examples
      }))
    };

    let result = await client.extractProperties(ctx.input.docsetId, schema);

    return {
      output: { result },
      message: `Started property extraction for **${ctx.input.properties.length}** property/ies on DocSet \`${ctx.input.docsetId}\`.`
    };
  })
  .build();

export let deleteProperties = SlateTool.create(spec, {
  name: 'Delete Properties',
  key: 'delete_properties',
  description: `Remove extracted metadata properties from all documents in a DocSet. Specify the property names to delete.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to delete properties from'),
      propertyNames: z.array(z.string()).describe('Names of the properties to delete')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Deletion job result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.deleteProperties(ctx.input.docsetId, ctx.input.propertyNames);

    return {
      output: { result },
      message: `Deleted **${ctx.input.propertyNames.length}** property/ies from DocSet \`${ctx.input.docsetId}\`.`
    };
  })
  .build();

export let suggestProperties = SlateTool.create(spec, {
  name: 'Suggest Properties',
  key: 'suggest_properties',
  description: `Ask Aryn to analyze documents in a DocSet and suggest a schema of properties that could be extracted. Useful when you don't know what metadata is available in your documents.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to analyze')
    })
  )
  .output(
    z.object({
      suggestedSchema: z.any().describe('Suggested property schema based on document analysis')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.suggestProperties(ctx.input.docsetId);

    return {
      output: { suggestedSchema: result },
      message: `Generated property suggestions for DocSet \`${ctx.input.docsetId}\`.`
    };
  })
  .build();
