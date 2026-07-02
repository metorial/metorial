import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.string().describe('Unique workspace identifier'),
  handle: z.string().describe('Workspace handle'),
  identityId: z.string().optional().describe('Owner identity ID'),
  state: z.string().optional().describe('Current workspace state'),
  desiredState: z.string().optional().describe('Desired workspace state'),
  instanceType: z
    .string()
    .optional()
    .describe('Workspace instance type (e.g. db1.shared, db1.small)'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all accessible workspaces. Can list workspaces for a specific user, organization, or all workspaces the authenticated user has access to.
Each workspace includes a dedicated Steampipe database instance, Powerpipe server, and Flowpipe server.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['user', 'org', 'all'])
        .default('all')
        .describe(
          'Scope to list workspaces from: user-owned, organization, or all accessible'
        ),
      userHandle: z
        .string()
        .optional()
        .describe('User handle (required when scope is "user")'),
      orgHandle: z
        .string()
        .optional()
        .describe('Organization handle (required when scope is "org")'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('List of workspaces'),
      nextToken: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;

    if (ctx.input.scope === 'user') {
      let userHandle = ctx.input.userHandle;
      if (!userHandle) {
        let actor = await client.getActor();
        userHandle = actor.handle;
      }
      result = await client.listUserWorkspaces(userHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    } else if (ctx.input.scope === 'org') {
      if (!ctx.input.orgHandle) {
        throw new Error('orgHandle is required when scope is "org"');
      }
      result = await client.listOrgWorkspaces(ctx.input.orgHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    } else {
      result = await client.listActorWorkspaces({
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    }

    return {
      output: {
        workspaces: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** workspace(s)${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();
