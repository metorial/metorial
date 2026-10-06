import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Get or set GitHub Actions permissions for a repository. Configure whether Actions is enabled, which actions are allowed, default GITHUB_TOKEN permissions, and whether GITHUB_TOKEN can approve pull requests. Selected-action policy requires allowedActions to be selected.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      action: z
        .enum([
          'get',
          'set',
          'get_workflow_permissions',
          'set_workflow_permissions',
          'get_selected_actions',
          'set_selected_actions'
        ])
        .describe('Action to perform'),
      githubOwnedAllowed: z
        .boolean()
        .optional()
        .describe('Allow actions owned by GitHub, for set_selected_actions'),
      verifiedAllowed: z
        .boolean()
        .optional()
        .describe('Allow verified Marketplace creators, for set_selected_actions'),
      patternsAllowed: z
        .array(z.string())
        .optional()
        .describe(
          'Allowed action or reusable-workflow patterns, for set_selected_actions; GitHub applies patterns to public repositories'
        ),
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
      githubOwnedAllowed: z
        .boolean()
        .optional()
        .describe('Whether GitHub-owned actions are allowed'),
      verifiedAllowed: z
        .boolean()
        .optional()
        .describe('Whether verified Marketplace creators are allowed'),
      patternsAllowed: z
        .array(z.string())
        .optional()
        .describe('Allowed action or reusable-workflow patterns'),
      updated: z.boolean().optional().describe('Whether permissions were updated')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
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
      if (ctx.input.enabled === undefined) throw createApiServiceError('enabled is required.');
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
      if (
        ctx.input.defaultWorkflowPermissions === undefined &&
        ctx.input.canApprovePullRequestReviews === undefined
      )
        throw createApiServiceError(
          'Provide defaultWorkflowPermissions or canApprovePullRequestReviews.'
        );
      await client.setRepoDefaultWorkflowPermissions(owner, repo, {
        defaultWorkflowPermissions: ctx.input.defaultWorkflowPermissions,
        canApprovePullRequestReviews: ctx.input.canApprovePullRequestReviews
      });
      return {
        output: { updated: true },
        message: `Updated workflow permissions for **${owner}/${repo}**.`
      };
    }

    if (action === 'get_selected_actions') {
      const data = await client.getSelectedActions(owner, repo);
      return {
        output: {
          githubOwnedAllowed: data.github_owned_allowed,
          verifiedAllowed: data.verified_allowed,
          patternsAllowed: data.patterns_allowed
        },
        message: 'Retrieved selected action and reusable-workflow policy.'
      };
    }
    if (action === 'set_selected_actions') {
      if (
        ctx.input.githubOwnedAllowed === undefined ||
        ctx.input.verifiedAllowed === undefined ||
        ctx.input.patternsAllowed === undefined
      )
        throw createApiServiceError(
          'githubOwnedAllowed, verifiedAllowed, and patternsAllowed are required for set_selected_actions.'
        );
      await client.setSelectedActions(owner, repo, {
        github_owned_allowed: ctx.input.githubOwnedAllowed,
        verified_allowed: ctx.input.verifiedAllowed,
        patterns_allowed: ctx.input.patternsAllowed
      });
      return {
        output: { updated: true },
        message: 'Updated selected action and reusable-workflow policy.'
      };
    }
    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
