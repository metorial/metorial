import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

let getHref = (value: any) => {
  if (typeof value?.href === 'string') return value.href;
  if (Array.isArray(value)) {
    return value.find((item: any) => typeof item?.href === 'string')?.href;
  }
  return undefined;
};

let getFormCount = (workspace: any) => {
  if (typeof workspace.forms?.count === 'number') return workspace.forms.count;
  if (Array.isArray(workspace.forms)) {
    let count = workspace.forms.find((item: any) => typeof item?.count === 'number')?.count;
    return typeof count === 'number' ? count : workspace.forms.length;
  }
  return undefined;
};

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `Retrieve a list of workspaces in your Typeform account. Workspaces organize forms and support team collaboration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter workspaces by name'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of workspaces per page')
    })
  )
  .output(
    z.object({
      totalItems: z.number().describe('Total number of workspaces'),
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Workspace ID'),
            name: z.string().describe('Workspace name'),
            shared: z.boolean().optional().describe('Whether the workspace is shared'),
            selfUrl: z.string().optional().describe('API URL for this workspace'),
            accountId: z.string().optional().describe('Account/organization ID'),
            formCount: z.number().optional().describe('Number of forms in the workspace')
          })
        )
        .describe('Array of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listWorkspaces({
      search: ctx.input.search,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let workspaces = (result.items || []).map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      shared: w.shared,
      selfUrl: getHref(w.self),
      accountId: w.account_id,
      formCount: getFormCount(w)
    }));

    return {
      output: {
        totalItems: result.total_items || workspaces.length,
        workspaces
      },
      message: `Found **${result.total_items || workspaces.length}** workspaces.`
    };
  })
  .build();
