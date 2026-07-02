import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
      auth: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let collection = await client.getCollection(ctx.input.collectionId);
    let info = collection.info ?? {};

    return {
      output: {
        name: info.name,
        collectionId: info._postman_id,
        description: info.description,
        schema: info.schema,
        items: collection.item,
        variables: collection.variable,
        auth: collection.auth
      },
      message: `Retrieved collection **"${info.name}"** with ${collection.item?.length ?? 0} top-level item(s).`
    };
  })
  .build();
