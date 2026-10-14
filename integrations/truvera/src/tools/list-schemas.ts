import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSchemas = SlateTool.create(spec, {
  name: 'List Schemas',
  key: 'list_schemas',
  description: `Retrieve all credential schemas created by the authenticated account. Schemas define the required structure of verifiable credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .refine(Number.isSafeInteger, 'Pagination values must be whole numbers')
        .min(0)
        .optional()
        .describe('Number of items to skip for pagination'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Pagination values must be whole numbers')
        .min(1)
        .max(64)
        .optional()
        .describe('Maximum number of items to return (max 64)')
    })
  )
  .output(
    z.object({
      schemas: z.array(
        z.object({
          schemaId: z.string().describe('Schema identifier'),
          schemaName: z.string().optional().describe('Schema name'),
          schemaDescription: z.string().optional().describe('Schema description'),
          schema: z.any().optional().describe('Full schema definition')
        })
      ),
      total: z.number().optional().describe('Total number of schemas')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listSchemas({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let list = Array.isArray(result) ? result : result?.list || [];
    let total = result?.total;

    let schemas = list.map((s: any) => ({
      schemaId: s.id || '',
      schemaName: s.name || s.schema?.name,
      schemaDescription: s.description || s.schema?.description,
      schema: s.schema !== undefined ? s.schema : s
    }));

    return {
      output: { schemas, total },
      message: `Found **${schemas.length}** schema(s)${total != null ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
