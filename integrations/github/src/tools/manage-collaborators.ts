import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollaborators = SlateTool.create(spec, {
  name: 'Manage Collaborators',
  key: 'manage_collaborators',
  description: `List, add, or remove collaborators on a GitHub repository. Control access permissions for individual users.`
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      username: z
        .string()
        .optional()
        .describe('Username of the collaborator (required for add/remove)'),
      permission: z
        .enum(['pull', 'triage', 'push', 'maintain', 'admin'])
        .optional()
        .describe('Permission level (for add action, default: push)'),
      perPage: z.number().optional().describe('Results per page (for list)'),
      page: z.number().optional().describe('Page number (for list)')
    })
  )
  .output(
    z.object({
      collaborators: z
        .array(
          z.object({
            username: z.string().describe('Collaborator username'),
            avatarUrl: z.string().describe('Avatar URL'),
            permissions: z
              .record(z.string(), z.boolean())
              .optional()
              .describe('Permission map')
          })
        )
        .optional()
        .describe('List of collaborators'),
      added: z.boolean().optional().describe('Whether the collaborator was added'),
      removed: z.boolean().optional().describe('Whether the collaborator was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, action, username } = ctx.input;

    if (action === 'list') {
      let collabs = await client.listCollaborators(owner, repo, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      return {
        output: {
          collaborators: collabs.map((c: any) => ({
            username: c.login,
            avatarUrl: c.avatar_url,
            permissions: c.permissions
          }))
        },
        message: `Found **${collabs.length}** collaborators in **${owner}/${repo}**.`
      };
    }

    if (!username) throw new Error('username is required for add/remove actions.');

    if (action === 'add') {
      await client.addCollaborator(owner, repo, username, ctx.input.permission);
      return {
        output: { added: true },
        message: `Added **${username}** as collaborator to **${owner}/${repo}** with ${ctx.input.permission ?? 'push'} permission.`
      };
    }

    if (action === 'remove') {
      await client.removeCollaborator(owner, repo, username);
      return {
        output: { removed: true },
        message: `Removed **${username}** from **${owner}/${repo}** collaborators.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
