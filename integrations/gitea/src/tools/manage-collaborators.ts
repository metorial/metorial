import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let listCollaborators = SlateTool.create(spec, {
  name: 'List Collaborators',
  key: 'list_collaborators',
  description: `List all collaborators of a repository with their access information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      collaborators: z.array(
        z.object({
          username: z.string().describe('Collaborator username'),
          fullName: z.string().describe('Collaborator display name'),
          email: z.string().describe('Collaborator email'),
          avatarUrl: z.string().describe('Avatar URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let collabs = await client.listCollaborators(ctx.input.owner, ctx.input.repo, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        collaborators: collabs.map(c => ({
          username: c.login,
          fullName: c.full_name || '',
          email: c.email || '',
          avatarUrl: c.avatar_url || ''
        }))
      },
      message: `Found **${collabs.length}** collaborators in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let manageCollaborator = SlateTool.create(spec, {
  name: 'Manage Collaborator',
  key: 'manage_collaborator',
  description: `Add or remove a collaborator from a repository. When adding, you can specify the permission level.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      username: z.string().describe('Username of the collaborator'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the collaborator'),
      permission: z
        .enum(['read', 'write', 'admin'])
        .optional()
        .describe('Permission level when adding (default: write)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });

    if (ctx.input.action === 'add') {
      await client.addCollaborator(
        ctx.input.owner,
        ctx.input.repo,
        ctx.input.username,
        ctx.input.permission
      );
    } else {
      await client.removeCollaborator(ctx.input.owner, ctx.input.repo, ctx.input.username);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${ctx.input.username}** as collaborator on **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();
