import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSchema = SlateTool.create(spec, {
  name: 'Get Schema',
  key: 'get_schema',
  description:
    'Retrieve a credential schema and its metadata by ID. Call list_schemas to discover schema IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      schemaId: z
        .string()
        .min(1)
        .describe('Schema ID or URI returned by list_schemas or create_schema')
    })
  )
  .output(
    z.object({
      schemaId: z.string().describe('Schema ID'),
      uri: z.string().optional().describe('Schema URI used when issuing credentials'),
      schema: z.any().describe('JSON Schema definition, when available'),
      metadata: z.any().describe('Full schema response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getSchema(ctx.input.schemaId);
    return {
      output: {
        schemaId: result?.id ?? ctx.input.schemaId,
        uri: result?.uri ?? undefined,
        schema: result?.schema ?? (result?.$schema ? result : null),
        metadata: result
      },
      message: `Retrieved credential schema **${result?.id ?? ctx.input.schemaId}**.`
    };
  })
  .build();
