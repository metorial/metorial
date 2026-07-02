import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `Retrieves all collections in the environment. Collections organize content items according to your business structure and can be used to filter content and control access.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z.array(
        z.object({
          collectionId: z.string().describe('Internal ID of the collection'),
          name: z.string().describe('Name of the collection'),
          codename: z.string().describe('Codename of the collection'),
          externalId: z.string().optional().describe('External ID if set')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let collections = await client.listCollections();

    let mapped = collections.map(c => ({
      collectionId: c.id,
      name: c.name,
      codename: c.codename,
      externalId: c.external_id
    }));

    return {
      output: { collections: mapped },
      message: `Retrieved **${mapped.length}** collection(s).`
    };
  })
  .build();
