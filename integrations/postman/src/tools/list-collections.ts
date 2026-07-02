import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCollectionsTool = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all Postman collections accessible to the authenticated user. Optionally filter by workspace ID to see collections in a specific workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter collections by workspace ID')
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          collectionId: z.string(),
          name: z.string(),
          uid: z.string().optional(),
          owner: z.string().optional(),
          isPublic: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let collections = await client.listCollections(
      ctx.input.workspaceId ? { workspace: ctx.input.workspaceId } : undefined
    );

    let result = collections.map((c: any) => ({
      collectionId: c.id,
      name: c.name,
      uid: c.uid,
      owner: c.owner,
      isPublic: c.isPublic,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: { collections: result },
      message: `Found **${result.length}** collection(s)${ctx.input.workspaceId ? ` in workspace ${ctx.input.workspaceId}` : ''}.`
    };
  })
  .build();
