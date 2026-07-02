import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createSchema = SlateTool.create(spec, {
  name: 'Create Schema',
  key: 'create_schema',
  description: `Create a new credential schema on the blockchain. Schemas define the structure and required fields of verifiable credentials. Once created, schemas can be referenced by their ID when issuing credentials.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      schemaName: z.string().describe('Human-readable schema name'),
      schemaDescription: z.string().optional().describe('Description of the schema'),
      properties: z
        .record(z.string(), z.any())
        .describe('JSON Schema properties object defining the credential fields'),
      required: z.array(z.string()).optional().describe('List of required field names'),
      additionalProperties: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to allow additional properties beyond defined fields')
    })
  )
  .output(
    z.object({
      schemaId: z.string().optional().describe('The on-chain schema blob ID'),
      jobId: z.string().optional().describe('Background job ID for blockchain registration'),
      schema: z.any().describe('The created schema details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      name: ctx.input.schemaName,
      description: ctx.input.schemaDescription,
      type: 'object',
      properties: ctx.input.properties,
      required: ctx.input.required,
      additionalProperties: ctx.input.additionalProperties
    };

    let result = await client.createSchema(body);

    let schemaId = result?.data?.id || result?.id;
    let jobId = result?.id;

    return {
      output: {
        schemaId: schemaId ? String(schemaId) : undefined,
        jobId: jobId ? String(jobId) : undefined,
        schema: result?.data || result
      },
      message: `Created schema **${ctx.input.schemaName}**${schemaId ? ` with ID ${schemaId}` : ''}.`
    };
  })
  .build();
