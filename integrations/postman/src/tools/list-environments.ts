import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEnvironmentsTool = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all Postman environments accessible to the authenticated user. Optionally filter by workspace ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter environments by workspace ID')
    })
  )
  .output(
    z.object({
      environments: z.array(
        z.object({
          environmentId: z.string(),
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
    let environments = await client.listEnvironments(
      ctx.input.workspaceId ? { workspace: ctx.input.workspaceId } : undefined
    );

    let result = environments.map((e: any) => ({
      environmentId: e.id,
      name: e.name,
      uid: e.uid,
      owner: e.owner,
      isPublic: e.isPublic,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));

    return {
      output: { environments: result },
      message: `Found **${result.length}** environment(s).`
    };
  })
  .build();
