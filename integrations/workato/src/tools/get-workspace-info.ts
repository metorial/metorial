import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let getWorkspaceInfoTool = SlateTool.create(spec, {
  name: 'Get Workspace Info',
  key: 'get_workspace_info',
  description: `Retrieve information about the current Workato workspace, including the workspace name, plan, recipe counts, billing period, and root folder ID.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.number().describe('Workspace/user ID'),
      name: z.string().describe('Workspace name'),
      email: z.string().nullable().describe('Contact email'),
      planId: z.string().nullable().describe('Current plan ID'),
      recipesCount: z.number().describe('Total recipe count'),
      activeRecipesCount: z.number().describe('Currently active recipe count'),
      rootFolderId: z.number().nullable().describe('Root folder ID of the workspace'),
      companyName: z.string().nullable().describe('Company name'),
      createdAt: z.string().describe('Workspace creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let info = await client.getWorkspaceInfo();

    return {
      output: {
        workspaceId: info.id,
        name: info.name ?? '',
        email: info.email ?? null,
        planId: info.plan_id ?? null,
        recipesCount: info.recipes_count ?? 0,
        activeRecipesCount: info.active_recipes_count ?? 0,
        rootFolderId: info.root_folder_id ?? null,
        companyName: info.company_name ?? null,
        createdAt: info.created_at
      },
      message: `Workspace **${info.name}** (ID: ${info.id}) — ${info.active_recipes_count ?? 0} active recipes of ${info.recipes_count ?? 0} total.`
    };
  });
