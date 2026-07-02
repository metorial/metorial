import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspaceTool = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Retrieve detailed information about a specific Postman workspace, including its collections, environments, mock servers, monitors, and APIs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to retrieve')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      type: z.string().optional(),
      description: z.string().optional(),
      visibility: z.string().optional(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      collections: z
        .array(
          z.object({
            collectionId: z.string().optional(),
            name: z.string().optional(),
            uid: z.string().optional()
          })
        )
        .optional(),
      environments: z
        .array(
          z.object({
            environmentId: z.string().optional(),
            name: z.string().optional(),
            uid: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let ws = await client.getWorkspace(ctx.input.workspaceId);

    return {
      output: {
        workspaceId: ws.id,
        name: ws.name,
        type: ws.type,
        description: ws.description,
        visibility: ws.visibility,
        createdBy: ws.createdBy,
        updatedBy: ws.updatedBy,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
        collections: ws.collections?.map((c: any) => ({
          collectionId: c.id,
          name: c.name,
          uid: c.uid
        })),
        environments: ws.environments?.map((e: any) => ({
          environmentId: e.id,
          name: e.name,
          uid: e.uid
        }))
      },
      message: `Retrieved workspace **"${ws.name}"** (${ws.type}).`
    };
  })
  .build();
