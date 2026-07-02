import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

export let getMetadataSchema = SlateTool.create(spec, {
  name: 'Get Metadata Schema',
  key: 'get_metadata_schema',
  description: `Retrieve the metadata schema for visitors or accounts in Pendo. Shows all configured metadata fields (both auto and custom), their types, and configuration. Useful for understanding available fields before running aggregations or updating metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['visitor', 'account'])
        .describe('Whether to get the schema for visitors or accounts')
    })
  )
  .output(
    z.object({
      entityType: z.string().describe('The entity type for this schema'),
      schema: z.any().describe('The metadata schema with field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let schema = await client.getMetadataSchema(ctx.input.entityType);

    return {
      output: {
        entityType: ctx.input.entityType,
        schema
      },
      message: `Retrieved metadata schema for **${ctx.input.entityType}** records.`
    };
  })
  .build();
