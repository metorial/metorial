import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type GitHubIssueResponse,
  GitHubIssuesLabelsClient,
  requirePositiveInteger,
  resolveIssueNumber,
  validateIssueFields
} from '../lib/github-issues-labels';
import { spec } from '../spec';

const issueFieldSchema = z
  .object({
    field_name: z
      .string()
      .describe(
        'Issue field name, matched case-insensitively against fields available to the repository'
      ),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe('Text, number, boolean, or YYYY-MM-DD date value to set'),
    field_option_name: z
      .string()
      .optional()
      .describe('Single-select option name to resolve and set'),
    delete: z.literal(true).optional().describe('Set to true to clear this issue field')
  })
  .strict();

const mapIssue = (
  issue: GitHubIssueResponse,
  stateOverride?: 'closed' | 'open',
  stateReason?: string
) => ({
  issueNumber: issue.number,
  issueId: issue.id,
  title: issue.title,
  state: stateOverride ?? issue.state,
  stateReason: stateReason ?? null,
  type:
    typeof issue.type === 'string'
      ? issue.type
      : issue.type && typeof issue.type.name === 'string'
        ? issue.type.name
        : null,
  htmlUrl: issue.html_url,
  author: issue.user.login,
  assignees: (issue.assignees ?? []).map(assignee => assignee.login),
  labels: (issue.labels ?? []).map(label =>
    typeof label === 'string' ? label : (label.name ?? '')
  ),
  createdAt: issue.created_at,
  updatedAt: issue.updated_at
});

export let manageIssue = SlateTool.create(spec, {
  name: 'Manage Issue',
  key: 'manage_issue',
  description:
    'Create or update a GitHub issue, including issue type, lifecycle state, duplicate closure, and organization-defined issue fields. Existing calls may continue to omit method and use issueNumber.',
  instructions: [
    'Use method "create" with a title to create an issue.',
    'Use method "update" with issue_number to update an issue; legacy issueNumber is also accepted.',
    'Each issue_fields item must provide field_name and exactly one of value, field_option_name, or delete: true.',
    'Use state "closed", state_reason "duplicate", and duplicate_of together to close an issue as a duplicate.'
  ]
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      method: z
        .enum(['create', 'update'])
        .optional()
        .describe('Write operation; omitted legacy calls infer update from issueNumber'),
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().optional().describe('Issue number to update (legacy field)'),
      issue_number: z.number().optional().describe('Issue number to update'),
      title: z.string().optional().describe('Issue title; required when creating'),
      body: z.string().optional().describe('Issue body content in Markdown'),
      state: z.enum(['open', 'closed']).optional().describe('New issue state'),
      stateReason: z
        .enum(['completed', 'not_planned', 'reopened'])
        .optional()
        .describe('Legacy reason for a state change'),
      state_reason: z
        .enum(['completed', 'not_planned', 'duplicate'])
        .optional()
        .describe('Reason for the state change; ignored unless state is changed'),
      duplicate_of: z
        .number()
        .optional()
        .describe(
          'Issue number this issue duplicates; only used with state_reason "duplicate"'
        ),
      labels: z.array(z.string()).optional().describe('Labels to apply to this issue'),
      assignees: z.array(z.string()).optional().describe('Usernames to assign'),
      milestone: z
        .number()
        .nullable()
        .optional()
        .describe('Milestone number to set, or null to remove during update'),
      type: z
        .string()
        .optional()
        .describe(
          'Issue type returned by list_issue_types; omit when issue types are unavailable'
        ),
      issue_fields: z
        .array(issueFieldSchema)
        .optional()
        .describe(
          'Issue field changes; each item requires field_name and exactly one value, field_option_name, or delete: true'
        )
    })
  )
  .output(
    z.object({
      issueNumber: z.number().describe('Issue number'),
      issueId: z.number().describe('Unique issue ID'),
      title: z.string().describe('Issue title'),
      state: z.string().describe('Issue state'),
      stateReason: z.string().nullable().describe('Requested state-change reason'),
      type: z.string().nullable().describe('Issue type when available'),
      htmlUrl: z.string().describe('URL to the issue on GitHub'),
      author: z.string().describe('Issue author login'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      labels: z.array(z.string()).describe('Label names'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const issueNumber = resolveIssueNumber(ctx.input.issueNumber, ctx.input.issue_number);
    if (issueNumber !== undefined) {
      requirePositiveInteger(issueNumber, 'issue_number');
    }
    if (ctx.input.duplicate_of !== undefined) {
      requirePositiveInteger(ctx.input.duplicate_of, 'duplicate_of');
    }
    const method = ctx.input.method ?? (issueNumber === undefined ? 'create' : 'update');
    if (method === 'update' && issueNumber === undefined) {
      throw createApiServiceError('issue_number is required for update method.', {
        reason: 'github_issue_update_number_required'
      });
    }
    if (method === 'create' && !ctx.input.title) {
      throw createApiServiceError('title is required for create method.', {
        reason: 'github_issue_create_title_required'
      });
    }

    if (
      ctx.input.stateReason !== undefined &&
      ctx.input.state_reason !== undefined &&
      ctx.input.stateReason !== ctx.input.state_reason
    ) {
      throw createApiServiceError(
        'stateReason and state_reason must match when both are provided.',
        { reason: 'github_issue_state_reason_conflict' }
      );
    }
    const stateReason = ctx.input.state_reason ?? ctx.input.stateReason;
    if (ctx.input.duplicate_of !== undefined && stateReason !== 'duplicate') {
      throw createApiServiceError(
        'duplicate_of can only be used when state_reason is "duplicate".',
        { reason: 'github_issue_duplicate_reason_required' }
      );
    }
    if (
      ctx.input.state === 'closed' &&
      stateReason === 'duplicate' &&
      ctx.input.duplicate_of === undefined
    ) {
      throw createApiServiceError(
        'duplicate_of must be provided when state_reason is "duplicate".',
        { reason: 'github_issue_duplicate_target_required' }
      );
    }
    if (ctx.input.state === 'closed' && stateReason === 'reopened') {
      throw createApiServiceError(
        'stateReason "reopened" can only be used when reopening an issue.',
        { reason: 'github_issue_state_reason_invalid' }
      );
    }

    validateIssueFields(ctx.input.issue_fields);
    const client = new GitHubIssuesLabelsClient(ctx.auth);
    const fieldChanges =
      ctx.input.issue_fields && ctx.input.issue_fields.length > 0
        ? await client.resolveIssueFieldChanges(
            ctx.input.owner,
            ctx.input.repo,
            ctx.input.issue_fields
          )
        : undefined;

    let issue: GitHubIssueResponse;
    if (method === 'create') {
      const body: Record<string, unknown> = {
        title: ctx.input.title
      };
      if (ctx.input.body !== undefined) body.body = ctx.input.body;
      if (ctx.input.assignees !== undefined) body.assignees = ctx.input.assignees;
      if (ctx.input.labels !== undefined) body.labels = ctx.input.labels;
      if (typeof ctx.input.milestone === 'number') body.milestone = ctx.input.milestone;
      if (ctx.input.type !== undefined) body.type = ctx.input.type;
      if (fieldChanges && fieldChanges.values.length > 0) {
        body.issue_field_values = fieldChanges.values;
      }

      issue = await client.createIssue(ctx.input.owner, ctx.input.repo, body);
    } else {
      const updateIssueNumber = issueNumber as number;
      const body: Record<string, unknown> = {};
      if (ctx.input.title !== undefined) body.title = ctx.input.title;
      if (ctx.input.body !== undefined) body.body = ctx.input.body;
      if (ctx.input.assignees !== undefined) body.assignees = ctx.input.assignees;
      if (ctx.input.labels !== undefined) body.labels = ctx.input.labels;
      if (ctx.input.milestone !== undefined) body.milestone = ctx.input.milestone;
      if (ctx.input.type !== undefined) body.type = ctx.input.type;

      let fallbackDeleteFieldIds: number[] = [];
      if (fieldChanges) {
        const plan = await client.prepareIssueFieldUpdate(
          ctx.input.owner,
          ctx.input.repo,
          updateIssueNumber,
          fieldChanges
        );
        if (plan.values) body.issue_field_values = plan.values;
        fallbackDeleteFieldIds = plan.fallbackDeleteFieldIds;
      }

      issue = await client.updateIssue(
        ctx.input.owner,
        ctx.input.repo,
        updateIssueNumber,
        body
      );
      for (const fieldId of fallbackDeleteFieldIds) {
        await client.deleteIssueFieldValue(
          ctx.input.owner,
          ctx.input.repo,
          updateIssueNumber,
          fieldId
        );
      }
      if (ctx.input.state) {
        await client.updateIssueState(
          ctx.input.owner,
          ctx.input.repo,
          updateIssueNumber,
          ctx.input.state,
          stateReason,
          ctx.input.duplicate_of
        );
      }
    }

    return {
      output: mapIssue(
        issue,
        method === 'update' ? ctx.input.state : undefined,
        method === 'update' && ctx.input.state ? stateReason : undefined
      ),
      message:
        method === 'update'
          ? `Updated issue **#${issue.number}** in **${ctx.input.owner}/${ctx.input.repo}** — ${issue.html_url}`
          : `Created issue **#${issue.number}**: "${issue.title}" in **${ctx.input.owner}/${ctx.input.repo}** — ${issue.html_url}`
    };
  })
  .build();
