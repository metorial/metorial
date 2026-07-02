import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let listObjectsTool = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description: `List all objects (data types) in the workspace, including built-in objects like People and Companies, and any custom objects. Useful for discovering available objects and their slugs before querying records.`,
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
            objectId: z.string().describe('The object ID'),
            apiSlug: z.string().describe('API slug for the object'),
            singularNoun: z.string().describe('Singular display name'),
            pluralNoun: z.string().describe('Plural display name'),
            createdAt: z.string().describe('When the object was created')
          })
        )
        .describe('Available objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    let objects = await client.listObjects();

    let mapped = objects.map((o: any) => ({
      objectId: o.id?.object_id ?? '',
      apiSlug: o.api_slug ?? '',
      singularNoun: o.singular_noun ?? '',
      pluralNoun: o.plural_noun ?? '',
      createdAt: o.created_at ?? ''
    }));

    return {
      output: { objects: mapped },
      message: `Found **${mapped.length}** object(s): ${mapped.map((o: any) => o.apiSlug).join(', ')}.`
    };
  })
  .build();
