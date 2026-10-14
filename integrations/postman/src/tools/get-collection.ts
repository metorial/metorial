import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeCollectionArray = (value: unknown, field: string): unknown[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    let entries = Object.entries(value);
    if (entries.every(([key]) => /^(0|[1-9]\d*)$/.test(key))) {
      return entries
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, item]) => item);
    }
  }
  throw createApiServiceError(`Postman returned an invalid collection ${field} list.`);
};

export let getCollectionTool = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve the full definition of a Postman collection, including its requests, folders, variables, auth configuration, and pre-request/test scripts. Accepts either a collection ID or UID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID or UID')
    })
  )
  .output(
    z.object({
      name: z.string().optional(),
      collectionId: z.string().optional(),
      description: z.string().optional(),
      schema: z.string().optional(),
      items: z.array(z.any()).optional(),
      variables: z.array(z.any()).optional(),
      auth: z.any().optional(),
      events: z.array(z.any()).optional(),
      collection: z
        .any()
        .optional()
        .describe('Complete collection definition for subsequent updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let collection = await client.getCollection(ctx.input.collectionId);
    let info = collection.info ?? {};
    let items = normalizeCollectionArray(collection.item, 'item');
    let variables = normalizeCollectionArray(collection.variable, 'variable');
    let events = normalizeCollectionArray(collection.event, 'event');

    return {
      output: {
        name: info.name,
        collectionId: info._postman_id,
        description:
          typeof info.description === 'string'
            ? info.description
            : (info.description?.content ?? undefined),
        schema: info.schema,
        items,
        variables,
        auth: collection.auth,
        events,
        collection
      },
      message: `Retrieved collection **"${info.name}"** with ${items?.length ?? 0} top-level item(s).`
    };
  })
  .build();
