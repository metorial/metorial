import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

let formatReviewer = (value: any) => {
  let account = value.reviewer || value.user || value;
  let reviewerType =
    typeof value.reviewer_type?.name === 'string'
      ? value.reviewer_type.name
      : typeof value.reviewer_type === 'string'
        ? value.reviewer_type
        : typeof value.type === 'string'
          ? value.type
          : undefined;

  return {
    username: account.username || account.nickname || undefined,
    displayName: account.display_name || undefined,
    uuid: account.uuid || undefined,
    accountId: account.account_id || undefined,
    reviewerType,
    inheritedFrom: value.inherited_from?.name || value.inherited_from?.key || undefined
  };
};

export let manageDefaultReviewersTool = SlateTool.create(spec, {
  name: 'Manage Default Reviewers',
  key: 'manage_default_reviewers',
  description: `List, get, add, or remove repository default reviewers. Default reviewers are automatically added to newly created pull requests.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      action: z
        .enum(['list', 'list_effective', 'get', 'add', 'remove'])
        .describe('Action to perform'),
      targetUsername: z
        .string()
        .optional()
        .describe('Bitbucket username to get/add/remove as a default reviewer'),
      page: z.number().optional().describe('Page number for list actions'),
      pageLen: z.number().optional().describe('Results per page for list actions')
    })
  )
  .output(
    z.object({
      reviewers: z
        .array(
          z.object({
            username: z.string().optional(),
            displayName: z.string().optional(),
            uuid: z.string().optional(),
            accountId: z.string().optional(),
            reviewerType: z.string().optional(),
            inheritedFrom: z.string().optional()
          })
        )
        .optional(),
      reviewer: z
        .object({
          username: z.string().optional(),
          displayName: z.string().optional(),
          uuid: z.string().optional(),
          accountId: z.string().optional(),
          reviewerType: z.string().optional(),
          inheritedFrom: z.string().optional()
        })
        .optional(),
      removed: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list' || ctx.input.action === 'list_effective') {
      let result =
        ctx.input.action === 'list'
          ? await client.listDefaultReviewers(ctx.input.repoSlug, {
              page: ctx.input.page,
              pageLen: ctx.input.pageLen
            })
          : await client.listEffectiveDefaultReviewers(ctx.input.repoSlug, {
              page: ctx.input.page,
              pageLen: ctx.input.pageLen
            });
      let reviewers = (result.values || []).map(formatReviewer);

      return {
        output: { reviewers, hasNextPage: !!result.next },
        message: `Found **${reviewers.length}** default reviewers.`
      };
    }

    if (!ctx.input.targetUsername) {
      throw bitbucketServiceError(
        'targetUsername is required for get, add, and remove actions'
      );
    }

    if (ctx.input.action === 'get') {
      let reviewer = await client.getDefaultReviewer(
        ctx.input.repoSlug,
        ctx.input.targetUsername
      );

      return {
        output: { reviewer: formatReviewer(reviewer) },
        message: `Retrieved default reviewer **${ctx.input.targetUsername}**.`
      };
    }

    if (ctx.input.action === 'add') {
      let reviewer = await client.addDefaultReviewer(
        ctx.input.repoSlug,
        ctx.input.targetUsername
      );

      return {
        output: { reviewer: formatReviewer(reviewer) },
        message: `Added **${ctx.input.targetUsername}** as a default reviewer.`
      };
    }

    await client.removeDefaultReviewer(ctx.input.repoSlug, ctx.input.targetUsername);

    return {
      output: { removed: true },
      message: `Removed **${ctx.input.targetUsername}** from default reviewers.`
    };
  })
  .build();
