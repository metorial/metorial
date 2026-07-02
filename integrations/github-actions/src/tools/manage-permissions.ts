import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Get or set GitHub Actions permissions for a repository. Configure whether Actions is enabled, which actions are allowed, default GITHUB_TOKEN permissions, and pull request approval settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      action: z
        .enum(['get', 'set', 'get_workflow_permissions', 'set_workflow_permissions'])
        .describe('Action to perform'),
      enabled: z.boolean().optional().describe('Whether Actions is enabled, for "set" action'),
      allowedActions: z
        .enum(['all', 'local_only', 'selected'])
        .optional()
        .describe('Which actions are allowed, for "set" action'),
      defaultWorkflowPermissions: z
        .enum(['read', 'write'])
        .optional()
        .describe('Default GITHUB_TOKEN permissions, for "set_workflow_permissions"'),
      canApprovePullRequestReviews: z
        .boolean()
        .optional()
        .describe('Whether GITHUB_TOKEN can approve PRs, for "set_workflow_permissions"')
    })
  )
  .output(
    z.object({
      enabled: z.boolean().optional().describe('Whether Actions is enabled'),
      allowedActions: z.string().optional().describe('Which actions are allowed'),
      defaultWorkflowPermissions: z
        .string()
        .optional()
        .describe('Default GITHUB_TOKEN permissions (read or write)'),
      canApprovePullRequestReviews: z
        .boolean()
        .optional()
        .describe('Whether GITHUB_TOKEN can approve PRs'),
      updated: z.boolean().optional().describe('Whether permissions were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, action } = ctx.input;

    if (action === 'get') {
      let perms = await client.getRepoPermissions(owner, repo);
      return {
        output: {
          enabled: perms.enabled,
          allowedActions: perms.allowed_actions
        },
        message: `Actions is **${perms.enabled ? 'enabled' : 'disabled'}**, allowed actions: **${perms.allowed_actions}**.`
      };
    }

    if (action === 'set') {
      if (ctx.input.enabled === undefined) throw new Error('enabled is required.');
      await client.setRepoPermissions(owner, repo, {
        enabled: ctx.input.enabled,
        allowedActions: ctx.input.allowedActions
      });
      return {
        output: { updated: true },
        message: `Updated Actions permissions for **${owner}/${repo}**.`
      };
    }

    if (action === 'get_workflow_permissions') {
      let perms = await client.getRepoDefaultWorkflowPermissions(owner, repo);
      return {
        output: {
          defaultWorkflowPermissions: perms.default_workflow_permissions,
          canApprovePullRequestReviews: perms.can_approve_pull_request_reviews
        },
        message: `GITHUB_TOKEN default: **${perms.default_workflow_permissions}**, can approve PRs: **${perms.can_approve_pull_request_reviews}**.`
      };
    }

    if (action === 'set_workflow_permissions') {
      await client.setRepoDefaultWorkflowPermissions(owner, repo, {
        defaultWorkflowPermissions: ctx.input.defaultWorkflowPermissions,
        canApprovePullRequestReviews: ctx.input.canApprovePullRequestReviews
      });
      return {
        output: { updated: true },
        message: `Updated workflow permissions for **${owner}/${repo}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
