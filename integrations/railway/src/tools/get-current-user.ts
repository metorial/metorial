import { ServiceError } from '@lowerdeck/error';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// GraphQL-level rejections (as opposed to HTTP/auth transport failures) mean the
// token type cannot run the query, e.g. Railway rejects `me` for workspace tokens.
let isGraphqlRejection = (error: unknown) =>
  error instanceof ServiceError &&
  (error.data as { reason?: unknown }).reason === 'railway_graphql_error';

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Identify the connected Railway credentials. Returns the user profile for account and OAuth tokens, the workspaces the token can access (use these workspace IDs with List Projects and Create Project), and the project and environment for project tokens.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tokenType: z
        .enum(['account', 'workspace', 'project'])
        .describe(
          'Kind of credential: "account" (user or OAuth token), "workspace" (workspace token), or "project" (project token)'
        ),
      user: z
        .object({
          userId: z.string().describe('Railway user ID'),
          name: z.string().nullable().describe('Display name'),
          email: z.string().nullable().describe('Email address'),
          username: z.string().nullable().describe('Username'),
          avatar: z.string().nullable().describe('Avatar URL')
        })
        .nullable()
        .describe('User profile, or null for workspace and project tokens'),
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Workspace ID'),
            name: z.string().describe('Workspace name')
          })
        )
        .describe('Workspaces the credentials can access'),
      project: z
        .object({
          projectTokenId: z.string().describe('Project token ID'),
          projectTokenName: z.string().nullable().describe('Project token name'),
          projectId: z.string().describe('Project ID the token is scoped to'),
          projectName: z.string().nullable().describe('Project name'),
          environmentId: z.string().describe('Environment ID the token is scoped to'),
          environmentName: z.string().nullable().describe('Environment name')
        })
        .nullable()
        .describe('Project scope for project tokens, or null for other credentials')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });

    if (client.usesProjectToken) {
      let token = await client.getProjectToken();

      return {
        output: {
          tokenType: 'project' as const,
          user: null,
          workspaces: [],
          project: {
            projectTokenId: token.id,
            projectTokenName: token.name ?? null,
            projectId: token.projectId,
            projectName: token.project?.name ?? null,
            environmentId: token.environmentId,
            environmentName: token.environment?.name ?? null
          }
        },
        message: `Connected with a project token for **${token.project?.name ?? token.projectId}** (${token.environment?.name ?? token.environmentId}).`
      };
    }

    let me: any;
    let meError: unknown;
    try {
      me = await client.getMe();
    } catch (error) {
      if (!isGraphqlRejection(error)) throw error;
      meError = error;
    }

    if (me) {
      let workspaces = (me.workspaces ?? []).map((workspace: any) => ({
        workspaceId: workspace.id,
        name: workspace.name
      }));

      return {
        output: {
          tokenType: 'account' as const,
          user: {
            userId: me.id,
            name: me.name ?? null,
            email: me.email ?? null,
            username: me.username ?? null,
            avatar: me.avatar ?? null
          },
          workspaces,
          project: null
        },
        message: `Connected as **${me.name ?? me.email}** with access to ${workspaces.length} workspace(s).`
      };
    }

    let tokenWorkspaces: { id: string; name: string }[];
    try {
      tokenWorkspaces = await client.getApiTokenWorkspaces();
    } catch {
      // Neither query works: surface the original profile error.
      throw meError;
    }

    let workspaces = tokenWorkspaces.map(workspace => ({
      workspaceId: workspace.id,
      name: workspace.name
    }));

    return {
      output: {
        tokenType: 'workspace' as const,
        user: null,
        workspaces,
        project: null
      },
      message: `Connected with a workspace token for **${workspaces.map(w => w.name).join(', ') || 'unknown workspace'}**.`
    };
  })
  .build();
