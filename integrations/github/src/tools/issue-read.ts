import { SlateTool } from 'slates';
import { z } from 'zod';
import type { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import {
  createGitHubReadClient,
  getRestPageMetadata,
  githubReadApiError,
  invalidGitHubReadInput,
  mapGitHubLabel
} from './read-shared';

let issueReadMethodSchema = z.enum([
  'get',
  'get_comments',
  'get_sub_issues',
  'get_parent',
  'get_labels'
]);

let labelSchema = z.object({
  labelId: z.number().describe('Numeric label ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  name: z.string().describe('Label name'),
  color: z.string().describe('Six-character label color'),
  description: z.string().nullable().describe('Label description'),
  isDefault: z.boolean().describe('Whether this is a default repository label'),
  apiUrl: z.string().optional().describe('GitHub API URL for the label')
});

let issueSummarySchema = z.object({
  issueId: z.number().describe('Numeric issue ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  issueNumber: z.number().describe('Issue number'),
  title: z.string().describe('Issue title'),
  body: z.string().nullable().optional().describe('Issue body in Markdown'),
  state: z.string().describe('Issue state'),
  stateReason: z.string().nullable().optional().describe('Reason for the issue state'),
  htmlUrl: z.string().describe('URL to the issue on GitHub'),
  author: z.string().nullable().describe('Issue author login'),
  labels: z.array(labelSchema).optional().describe('Labels assigned to the issue'),
  assignees: z.array(z.string()).optional().describe('Assigned usernames'),
  commentsCount: z.number().optional().describe('Number of conversation comments'),
  locked: z.boolean().optional().describe('Whether the issue is locked'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  closedAt: z.string().nullable().optional().describe('Closure timestamp'),
  hasParent: z.boolean().optional().describe('Whether this issue has a parent issue'),
  hasChildren: z.boolean().optional().describe('Whether this issue has child issues'),
  parent: z
    .object({
      issueNumber: z.number().describe('Parent issue number'),
      title: z.string().describe('Parent issue title'),
      state: z.string().describe('Parent issue state'),
      htmlUrl: z.string().describe('URL to the parent issue'),
      repository: z.string().describe('Parent repository in owner/name form')
    })
    .nullable()
    .optional()
    .describe('Parent issue summary'),
  subIssuesSummary: z
    .object({
      total: z.number().describe('Total child issues'),
      completed: z.number().describe('Completed child issues'),
      percentCompleted: z.number().describe('Percentage of child issues completed')
    })
    .nullable()
    .optional()
    .describe('Child issue completion summary'),
  fieldValues: z
    .array(
      z.object({
        field: z.string().describe('Custom issue field name'),
        value: z.string().describe('Custom issue field value')
      })
    )
    .optional()
    .describe('Custom issue field values')
});

let commentSchema = z.object({
  commentId: z.number().describe('Numeric comment ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  body: z.string().nullable().describe('Comment body in Markdown'),
  author: z.string().nullable().describe('Comment author login'),
  authorAssociation: z.string().optional().describe('Author relationship to the repository'),
  htmlUrl: z.string().describe('URL to the comment on GitHub'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let parentSchema = z.object({
  issueNumber: z.number().describe('Parent issue number'),
  title: z.string().describe('Parent issue title'),
  state: z.string().describe('Parent issue state'),
  htmlUrl: z.string().describe('URL to the parent issue'),
  repository: z.string().describe('Parent repository in owner/name form')
});

let mapIssueSummary = (
  issue: any,
  enrichment?: Awaited<ReturnType<GitHubClient['getIssueReadEnrichment']>>
) => ({
  issueId: issue.id,
  nodeId: issue.node_id,
  issueNumber: issue.number,
  title: issue.title,
  body: issue.body ?? null,
  state: issue.state,
  stateReason: issue.state_reason ?? null,
  htmlUrl: issue.html_url,
  author: issue.user?.login ?? null,
  labels: (issue.labels ?? [])
    .filter((label: unknown) => typeof label !== 'string')
    .map(mapGitHubLabel),
  assignees: (issue.assignees ?? []).map((assignee: any) => assignee.login),
  commentsCount: issue.comments,
  locked: issue.locked,
  createdAt: issue.created_at,
  updatedAt: issue.updated_at,
  closedAt: issue.closed_at ?? null,
  hasParent: enrichment?.hasParent,
  hasChildren: enrichment?.hasChildren,
  parent: enrichment?.parent
    ? {
        issueNumber: enrichment.parent.number,
        title: enrichment.parent.title,
        state: enrichment.parent.state,
        htmlUrl: enrichment.parent.url,
        repository: enrichment.parent.repository.nameWithOwner
      }
    : enrichment
      ? null
      : undefined,
  subIssuesSummary: enrichment?.subIssuesSummary ?? (enrichment ? null : undefined),
  fieldValues: enrichment?.fieldValues
});

let mapIssueComment = (comment: any) => ({
  commentId: comment.id,
  nodeId: comment.node_id,
  body: comment.body ?? null,
  author: comment.user?.login ?? null,
  authorAssociation: comment.author_association,
  htmlUrl: comment.html_url,
  createdAt: comment.created_at,
  updatedAt: comment.updated_at
});

export let issueRead = SlateTool.create(spec, {
  name: 'Issue Read',
  key: 'issue_read',
  description:
    'Read details, conversation comments, child issues, the parent issue, or assigned labels for a single GitHub issue.',
  instructions: [
    'Use method "get_comments" for issue conversation comments.',
    'Use method "get_sub_issues" or "get_parent" to inspect issue hierarchy.',
    'Pagination applies only to "get_comments" and "get_sub_issues".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      method: issueReadMethodSchema.describe(
        'Read operation: get returns details and hierarchy signals; get_comments returns conversation comments; get_sub_issues returns children; get_parent returns the parent; get_labels returns assigned labels'
      ),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issue_number: z.number().describe('Issue number'),
      page: z.number().min(1).optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page for pagination')
    })
  )
  .output(
    z.object({
      method: issueReadMethodSchema.describe('Read operation performed'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number'),
      issue: issueSummarySchema.optional().describe('Issue details for the get method'),
      comments: z.array(commentSchema).optional().describe('Issue conversation comments'),
      subIssues: z.array(issueSummarySchema).optional().describe('Child issues'),
      parent: parentSchema.nullable().optional().describe('Parent issue, or null when absent'),
      labels: z.array(labelSchema).optional().describe('Labels assigned to the issue'),
      totalCount: z.number().optional().describe('Provider-reported total count'),
      returnedCount: z.number().optional().describe('Number of items returned on this page'),
      page: z.number().optional().describe('Current REST page number'),
      perPage: z.number().optional().describe('Requested results per page')
    })
  )
  .handleInvocation(async ctx => {
    let { method, owner, repo, issue_number: issueNumber, page, perPage } = ctx.input;
    let pagedMethod = method === 'get_comments' || method === 'get_sub_issues';
    if (!pagedMethod && (page !== undefined || perPage !== undefined)) {
      throw invalidGitHubReadInput(
        `page and perPage are only supported for "get_comments" and "get_sub_issues", not "${method}".`
      );
    }

    let client = createGitHubReadClient(ctx.auth);

    try {
      if (method === 'get') {
        let rawIssue = await client.getIssue(owner, repo, issueNumber);
        let enrichment: Awaited<ReturnType<GitHubClient['getIssueReadEnrichment']>> = null;
        try {
          enrichment = await client.getIssueReadEnrichment(owner, repo, issueNumber);
        } catch {
          // Hierarchy and custom-field signals are best-effort and must not fail the base read.
        }
        let issue = mapIssueSummary(rawIssue, enrichment);
        return {
          output: { method, owner, repo, issueNumber, issue },
          message: `Read issue **#${issueNumber}** in **${owner}/${repo}**.`
        };
      }

      if (method === 'get_comments') {
        let comments = (
          await client.listIssueComments(owner, repo, issueNumber, { page, perPage })
        ).map(mapIssueComment);
        return {
          output: {
            method,
            owner,
            repo,
            issueNumber,
            comments,
            ...getRestPageMetadata(comments.length, { page, perPage })
          },
          message: `Found **${comments.length}** comments on issue **#${issueNumber}**.`
        };
      }

      if (method === 'get_sub_issues') {
        let subIssues = (
          await client.listSubIssues(owner, repo, issueNumber, { page, perPage })
        ).map(mapIssueSummary);
        return {
          output: {
            method,
            owner,
            repo,
            issueNumber,
            subIssues,
            ...getRestPageMetadata(subIssues.length, { page, perPage })
          },
          message: `Found **${subIssues.length}** child issues for **#${issueNumber}**.`
        };
      }

      if (method === 'get_parent') {
        let rawParent = await client.getIssueParent(owner, repo, issueNumber);
        let parent = rawParent
          ? {
              issueNumber: rawParent.number,
              title: rawParent.title,
              state: rawParent.state,
              htmlUrl: rawParent.url,
              repository: rawParent.repository.nameWithOwner
            }
          : null;
        return {
          output: { method, owner, repo, issueNumber, parent },
          message: parent
            ? `Issue **#${issueNumber}** has parent **${parent.repository}#${parent.issueNumber}**.`
            : `Issue **#${issueNumber}** has no parent issue.`
        };
      }

      let labels = (await client.listIssueLabels(owner, repo, issueNumber)).map(
        mapGitHubLabel
      );
      return {
        output: {
          method,
          owner,
          repo,
          issueNumber,
          labels,
          totalCount: labels.length
        },
        message: `Found **${labels.length}** labels on issue **#${issueNumber}**.`
      };
    } catch (error) {
      throw githubReadApiError(error, `${method.replaceAll('_', ' ')} for issue`);
    }
  })
  .build();
