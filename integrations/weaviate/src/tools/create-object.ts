import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createObject = SlateTool.create(spec, {
  name: 'Create Object',
  key: 'create_object',
  description: `Create a new data object in a Weaviate collection. Optionally provide a pre-computed vector embedding, or let the configured vectorizer generate one automatically.
Supports multi-tenant collections by specifying the tenant name.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to add the object to'),
      properties: z
        .record(z.string(), z.any())
        .describe('Object property values as key-value pairs'),
      objectId: z
        .string()
        .optional()
        .describe(
          'Optional UUID for the object. If not provided, one is generated automatically'
        ),
      vector: z
        .array(z.number())
        .optional()
        .describe('Optional pre-computed vector embedding'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
    })
  )
  .output(
    z
      .object({
        objectId: z.string().describe('UUID of the created object'),
        class: z.string().describe('Collection the object belongs to'),
        properties: z.record(z.string(), z.any()).describe('Object properties'),
        creationTimeUnix: z
          .number()
          .optional()
          .describe('Creation timestamp in Unix milliseconds')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createObject({
      class: ctx.input.collectionName,
      properties: ctx.input.properties,
      id: ctx.input.objectId,
      vector: ctx.input.vector,
      tenant: ctx.input.tenant
    });
    return {
      output: {
        objectId: result.id,
        class: result.class,
        properties: result.properties,
        creationTimeUnix: result.creationTimeUnix
      },
      message: `Created object **${result.id}** in collection **${ctx.input.collectionName}**.`
    };
  })
  .build();
