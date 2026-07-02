import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces accessible to the authenticated user. Workspaces are the organizational unit in Appsmith that group applications, datasources, and users together.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Unique workspace identifier.'),
            name: z.string().describe('Workspace name.'),
            slug: z.string().optional().describe('Workspace URL slug.'),
            website: z.string().optional().describe('Website associated with the workspace.'),
            email: z.string().optional().describe('Email associated with the workspace.')
          })
        )
        .describe('List of workspaces.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let workspaces = await client.listWorkspaces();

    let mapped = workspaces.map((ws: any) => ({
      workspaceId: ws.id ?? '',
      name: ws.name ?? '',
      slug: ws.slug,
      website: ws.website,
      email: ws.email
    }));

    return {
      output: { workspaces: mapped },
      message: `Found **${mapped.length}** workspace(s).`
    };
  })
  .build();
