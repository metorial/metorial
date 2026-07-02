import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let manageSchema = SlateTool.create(spec, {
  name: 'Manage Schema',
  key: 'manage_schema',
  description: `Create, retrieve, or list credential schemas. Schemas define the structure and required fields for Verifiable Credentials using JSON Schema format.
Schemas can be registered on the blockchain and referenced when issuing credentials.`,
  instructions: [
    'To create a schema, set action to "create" and provide the schema definition including properties, required fields, and an author DID.',
    'To get a schema, set action to "get" and provide the schemaId.',
    'To list all schemas, set action to "list".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Operation to perform'),
      schemaId: z.string().optional().describe('Schema ID (required for get)'),
      schemaDefinition: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'JSON Schema definition for the credential schema. Must include $schema, type, properties, and author DID'
        ),
      offset: z.number().optional().describe('Pagination offset for list'),
      limit: z.number().optional().describe('Maximum number of results for list')
    })
  )
  .output(
    z.object({
      schema: z.record(z.string(), z.unknown()).optional().describe('The schema document'),
      schemas: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of schemas')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.schemaDefinition)
          throw new Error('schemaDefinition is required for create action');
        let result = await client.createSchema(ctx.input.schemaDefinition);
        return {
          output: { schema: result },
          message: `Created schema${result.id ? ` **${result.id}**` : ''}`
        };
      }
      case 'get': {
        if (!ctx.input.schemaId) throw new Error('schemaId is required for get action');
        let result = await client.getSchema(ctx.input.schemaId);
        return {
          output: { schema: result },
          message: `Retrieved schema **${ctx.input.schemaId}**`
        };
      }
      case 'list': {
        let results = await client.listSchemas({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        return {
          output: { schemas: results },
          message: `Found **${results.length}** schema(s)`
        };
      }
    }
  })
  .build();
