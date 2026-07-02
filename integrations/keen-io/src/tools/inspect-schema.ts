import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inspectSchema = SlateTool.create(spec, {
  name: 'Inspect Schema',
  key: 'inspect_schema',
  description: `Inspect event collection schemas in a Keen.io project. List all event collections with their property names and types, or inspect the schema of a specific collection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z
        .string()
        .optional()
        .describe(
          'Name of the event collection to inspect. If omitted, lists all event collections.'
        )
    })
  )
  .output(
    z.object({
      collections: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of all event collections with schema info'),
      collectionSchema: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schema details for a specific collection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    if (ctx.input.collectionName) {
      let schema = await client.getEventCollectionSchema(ctx.input.collectionName);
      return {
        output: { collectionSchema: schema },
        message: `Retrieved schema for collection **${ctx.input.collectionName}**.`
      };
    }

    let collections = await client.listEventCollections();
    return {
      output: { collections },
      message: `Found **${collections.length}** event collection(s) in the project.`
    };
  });
