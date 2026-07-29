import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let subIssueWrite = SlateTool.create(spec, {
  name: 'Change Sub-Issue',
  key: 'sub_issue_write',
  description: 'Add a sub-issue to a parent issue in a GitHub repository.',
  tags: { destructive: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      method: z
        .string()
        .describe(
          "The action to perform on a single sub-issue\nOptions are:\n- 'add' - add a sub-issue to a parent issue in a GitHub repository.\n- 'remove' - remove a sub-issue from a parent issue in a GitHub repository.\n- 'reprioritize' - change the order of sub-issues within a parent issue in a GitHub repository. Use either 'after_id' or 'before_id' to specify the new position.\nWrites issue hierarchy. To move a sub-issue to a new parent, use `add` with `replace_parent=true`; there is no writable parent field.\n"
        ),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issue_number: z.number().describe('The number of the parent issue'),
      sub_issue_id: z
        .number()
        .describe('The ID of the sub-issue to add. ID is not the same as issue number'),
      replace_parent: z
        .boolean()
        .optional()
        .describe(
          "When true, replaces the sub-issue's current parent issue. Use with 'add' method only."
        ),
      after_id: z
        .number()
        .optional()
        .describe(
          'The ID of the sub-issue to be prioritized after (either after_id OR before_id should be specified)'
        ),
      before_id: z
        .number()
        .optional()
        .describe(
          'The ID of the sub-issue to be prioritized before (either after_id OR before_id should be specified)'
        )
    })
  )
  .output(
    z.object({
      method: z.string(),
      parentIssueNumber: z.number(),
      subIssueId: z.number(),
      result: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let method = ctx.input.method.toLowerCase();
    if (!['add', 'remove', 'reprioritize'].includes(method)) {
      throw createApiServiceError(
        `Unknown sub-issue method "${ctx.input.method}". Use add, remove, or reprioritize.`,
        { reason: 'github_sub_issue_unknown_method' }
      );
    }
    if (method !== 'add' && ctx.input.replace_parent !== undefined) {
      throw createApiServiceError('replace_parent is only supported for the add method.', {
        reason: 'github_sub_issue_replace_parent_unsupported'
      });
    }

    let hasAfter = ctx.input.after_id !== undefined;
    let hasBefore = ctx.input.before_id !== undefined;
    if (method === 'reprioritize' && hasAfter === hasBefore) {
      throw createApiServiceError(
        'Reprioritize requires exactly one of after_id or before_id.',
        { reason: 'github_sub_issue_invalid_priority_position' }
      );
    }
    if (method !== 'reprioritize' && (hasAfter || hasBefore)) {
      throw createApiServiceError(
        'after_id and before_id are only supported for the reprioritize method.',
        { reason: 'github_sub_issue_priority_position_unsupported' }
      );
    }

    let client = new GitHubClient(ctx.auth);
    let result: Record<string, any>;
    switch (method) {
      case 'add':
        result = await client.addSubIssue(
          ctx.input.owner,
          ctx.input.repo,
          ctx.input.issue_number,
          ctx.input.sub_issue_id,
          ctx.input.replace_parent
        );
        break;
      case 'remove':
        result = await client.removeSubIssue(
          ctx.input.owner,
          ctx.input.repo,
          ctx.input.issue_number,
          ctx.input.sub_issue_id
        );
        break;
      default:
        result = await client.reprioritizeSubIssue(
          ctx.input.owner,
          ctx.input.repo,
          ctx.input.issue_number,
          ctx.input.sub_issue_id,
          {
            afterId: ctx.input.after_id,
            beforeId: ctx.input.before_id
          }
        );
    }

    return {
      output: {
        method,
        parentIssueNumber: ctx.input.issue_number,
        subIssueId: ctx.input.sub_issue_id,
        result
      },
      message: `${method === 'add' ? 'Added' : method === 'remove' ? 'Removed' : 'Reprioritized'} sub-issue ID **${ctx.input.sub_issue_id}** ${method === 'remove' ? 'from' : 'under'} issue **#${ctx.input.issue_number}** in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
