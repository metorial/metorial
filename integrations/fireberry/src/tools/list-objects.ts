import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listObjects = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description: `Retrieve all available object types in the Fireberry system, including standard and custom objects.
Returns each object's display name, system name, and object type number. Useful for discovering available objects before querying or creating records.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            name: z.string().describe('Display name of the object'),
            systemName: z.string().describe('System name used in API calls'),
            objectType: z.string().describe('Object type number used in query requests')
          })
        )
        .describe('All available objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let objects = await client.getAllObjects();

    return {
      output: { objects },
      message: `Found **${objects.length}** objects in the system.`
    };
  })
  .build();
