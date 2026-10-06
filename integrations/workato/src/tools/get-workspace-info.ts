import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { spec } from '../spec';

export let getWorkspaceInfoTool = SlateTool.create(spec, {
  name: 'Get Workspace Info',
  key: 'get_workspace_info',
  description: `Retrieve the authenticated Workato workspace account, including available workspace, environment, plan, recipe-count, and root-folder metadata. This does not identify an individual API client.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.number().optional().describe('Workspace/user ID'),
      name: z.string().optional().describe('Workspace name'),
      email: z.string().nullable().optional().describe('Contact email'),
      planId: z.string().nullable().optional().describe('Current plan ID'),
      recipesCount: z.number().optional().describe('Total recipe count'),
      activeRecipesCount: z.number().optional().describe('Currently active recipe count'),
      rootFolderId: z
        .number()
        .nullable()
        .optional()
        .describe('Root folder ID of the workspace'),
      teamName: z.string().optional().describe('Native workspace team name'),
      environmentName: z.string().optional().describe('Native environment name'),
      companyName: z.string().nullable().optional().describe('Company name'),
      createdAt: z.string().optional().describe('Workspace creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const output = map.workspace(await client.getWorkspaceInfo());
    return {
      output,
      message: `Retrieved authenticated workspace context ${output.workspaceId}. This endpoint describes the workspace account, not the identity of an individual API client.`
    };
  });
