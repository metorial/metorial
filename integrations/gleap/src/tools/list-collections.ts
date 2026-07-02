import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Help Center Collections',
  key: 'list_collections',
  description: `Retrieve all help center collections (categories) for the project. Each collection includes article and subcollection counts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z
        .array(z.record(z.string(), z.any()))
        .describe('List of collection objects with article counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let collections = await client.listCollections();
    let collectionList = Array.isArray(collections) ? collections : [];

    return {
      output: { collections: collectionList },
      message: `Retrieved **${collectionList.length}** help center collections.`
    };
  })
  .build();
