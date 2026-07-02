import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

let branchRestrictionKinds = [
  'push',
  'force',
  'delete',
  'restrict_merges',
  'require_tasks_to_be_completed',
  'require_approvals_to_merge',
  'require_default_reviewer_approvals_to_merge',
  'require_no_changes_requested',
  'require_passing_builds_to_merge',
  'require_commits_behind',
  'reset_pullrequest_approvals_on_change',
  'smart_reset_pullrequest_approvals',
  'reset_pullrequest_changes_requested_on_change',
  'require_all_dependencies_merged',
  'enforce_merge_checks',
  'allow_auto_merge_when_builds_pass'
] as const;

let branchMatchKinds = ['glob', 'branching_model'] as const;

let formatRestriction = (restriction: any) => ({
  restrictionId: String(restriction.id),
  kind: restriction.kind,
  branchMatchKind: restriction.branch_match_kind || undefined,
  branchType: restriction.branch_type || undefined,
  pattern: restriction.pattern || undefined,
  value: typeof restriction.value === 'number' ? restriction.value : undefined,
  users: (restriction.users || []).map((user: any) => ({
    username: user.username || user.nickname || undefined,
    displayName: user.display_name || undefined,
    uuid: user.uuid || undefined,
    accountId: user.account_id || undefined
  })),
  groups: (restriction.groups || []).map((group: any) => ({
    name: group.name || undefined,
    slug: group.slug || undefined
  }))
});

let buildRestrictionBody = (input: {
  kind?: (typeof branchRestrictionKinds)[number];
  branchMatchKind?: (typeof branchMatchKinds)[number];
  branchType?: string;
  pattern?: string;
  value?: number;
  userUuids?: string[];
  groupSlugs?: string[];
}) => {
  let body: Record<string, any> = {};
  if (input.kind !== undefined) body.kind = input.kind;
  if (input.branchMatchKind !== undefined) body.branch_match_kind = input.branchMatchKind;
  if (input.branchType !== undefined) body.branch_type = input.branchType;
  if (input.pattern !== undefined) body.pattern = input.pattern;
  if (input.value !== undefined) body.value = input.value;
  if (input.userUuids !== undefined) {
    body.users = input.userUuids.map(uuid => ({ uuid }));
  }
  if (input.groupSlugs !== undefined) {
    body.groups = input.groupSlugs.map(slug => ({ slug }));
  }
  return body;
};

export let manageBranchRestrictionsTool = SlateTool.create(spec, {
  name: 'Manage Branch Restrictions',
  key: 'manage_branch_restrictions',
  description: `List, get, create, update, or delete branch restriction rules. These rules enforce push restrictions and merge checks for matching branches.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      restrictionId: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Branch restriction ID (required for get/update/delete)'),
      kind: z
        .enum(branchRestrictionKinds)
        .optional()
        .describe('Restriction kind, such as force or require_passing_builds_to_merge'),
      branchMatchKind: z
        .enum(branchMatchKinds)
        .optional()
        .describe('How branches are matched. Defaults to glob when creating.'),
      branchType: z
        .string()
        .optional()
        .describe(
          'Branching model branch type, required when branchMatchKind is branching_model'
        ),
      pattern: z
        .string()
        .optional()
        .describe(
          'Glob pattern for branch matching. Defaults to * when creating with glob matching.'
        ),
      value: z
        .number()
        .optional()
        .describe('Numeric value for merge-check restrictions that require one'),
      userUuids: z
        .array(z.string())
        .optional()
        .describe('User UUIDs for restrictions that target users'),
      groupSlugs: z
        .array(z.string())
        .optional()
        .describe('Group slugs for restrictions that target groups'),
      page: z.number().optional().describe('Page number for listing'),
      pageLen: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      restrictions: z
        .array(
          z.object({
            restrictionId: z.string(),
            kind: z.string(),
            branchMatchKind: z.string().optional(),
            branchType: z.string().optional(),
            pattern: z.string().optional(),
            value: z.number().optional(),
            users: z.array(
              z.object({
                username: z.string().optional(),
                displayName: z.string().optional(),
                uuid: z.string().optional(),
                accountId: z.string().optional()
              })
            ),
            groups: z.array(
              z.object({
                name: z.string().optional(),
                slug: z.string().optional()
              })
            )
          })
        )
        .optional(),
      restriction: z
        .object({
          restrictionId: z.string(),
          kind: z.string(),
          branchMatchKind: z.string().optional(),
          branchType: z.string().optional(),
          pattern: z.string().optional(),
          value: z.number().optional(),
          users: z.array(
            z.object({
              username: z.string().optional(),
              displayName: z.string().optional(),
              uuid: z.string().optional(),
              accountId: z.string().optional()
            })
          ),
          groups: z.array(
            z.object({
              name: z.string().optional(),
              slug: z.string().optional()
            })
          )
        })
        .optional(),
      deleted: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list') {
      let result = await client.listBranchRestrictions(ctx.input.repoSlug, {
        kind: ctx.input.kind,
        pattern: ctx.input.pattern,
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      });
      let restrictions = (result.values || []).map(formatRestriction);

      return {
        output: { restrictions, hasNextPage: !!result.next },
        message: `Found **${restrictions.length}** branch restrictions.`
      };
    }

    if (ctx.input.action === 'get') {
      if (ctx.input.restrictionId === undefined) {
        throw bitbucketServiceError('restrictionId is required for get action');
      }

      let restriction = await client.getBranchRestriction(
        ctx.input.repoSlug,
        ctx.input.restrictionId
      );

      return {
        output: { restriction: formatRestriction(restriction) },
        message: `Retrieved branch restriction **${restriction.id}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.kind) {
        throw bitbucketServiceError('kind is required for create action');
      }

      let branchMatchKind = ctx.input.branchMatchKind ?? 'glob';
      if (branchMatchKind === 'branching_model' && !ctx.input.branchType) {
        throw bitbucketServiceError(
          'branchType is required when branchMatchKind is branching_model'
        );
      }

      let body = buildRestrictionBody({
        kind: ctx.input.kind,
        branchMatchKind,
        branchType: ctx.input.branchType,
        pattern: branchMatchKind === 'glob' ? (ctx.input.pattern ?? '*') : ctx.input.pattern,
        value: ctx.input.value,
        userUuids: ctx.input.userUuids,
        groupSlugs: ctx.input.groupSlugs
      });
      let restriction = await client.createBranchRestriction(ctx.input.repoSlug, body);

      return {
        output: { restriction: formatRestriction(restriction) },
        message: `Created branch restriction **${restriction.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (ctx.input.restrictionId === undefined) {
        throw bitbucketServiceError('restrictionId is required for update action');
      }

      let body = buildRestrictionBody({
        kind: ctx.input.kind,
        branchMatchKind: ctx.input.branchMatchKind,
        branchType: ctx.input.branchType,
        pattern: ctx.input.pattern,
        value: ctx.input.value,
        userUuids: ctx.input.userUuids,
        groupSlugs: ctx.input.groupSlugs
      });

      if (Object.keys(body).length === 0) {
        throw bitbucketServiceError(
          'At least one branch restriction field is required for update action'
        );
      }

      let restriction = await client.updateBranchRestriction(
        ctx.input.repoSlug,
        ctx.input.restrictionId,
        body
      );

      return {
        output: { restriction: formatRestriction(restriction) },
        message: `Updated branch restriction **${restriction.id}**.`
      };
    }

    if (ctx.input.restrictionId === undefined) {
      throw bitbucketServiceError('restrictionId is required for delete action');
    }

    await client.deleteBranchRestriction(ctx.input.repoSlug, ctx.input.restrictionId);

    return {
      output: { deleted: true },
      message: `Deleted branch restriction **${ctx.input.restrictionId}**.`
    };
  })
  .build();
