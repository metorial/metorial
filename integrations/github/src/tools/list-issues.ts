import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description:
    'List issues in a GitHub repository with cursor pagination, labels, custom issue fields, state, date, and ordering filters. Pass pageInfo.endCursor from one response as after to retrieve the next page.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['OPEN', 'CLOSED'])
        .optional()
        .describe('Filter by state; omit to return both open and closed issues'),
      labels: z.array(z.string()).optional().describe('Label names to filter by'),
      orderBy: z
        .enum(['CREATED_AT', 'UPDATED_AT', 'COMMENTS'])
        .optional()
        .describe('Field used to order issues'),
      direction: z.enum(['ASC', 'DESC']).optional().describe('Order direction'),
      since: z
        .string()
        .optional()
        .describe('Only issues updated after this ISO 8601 date or timestamp'),
      field_filters: z
        .array(
          z.object({
            field_name: z.string().describe('Case-insensitive custom issue field name'),
            value: z
              .string()
              .describe('Field value: option name, text, numeric string, or YYYY-MM-DD date')
          })
        )
        .optional()
        .describe('Custom issue field values to filter by'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (minimum 1, maximum 100)'),
      after: z
        .string()
        .optional()
        .describe('Cursor from the previous response pageInfo.endCursor')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueNumber: z.number().describe('Issue number'),
          title: z.string().describe('Issue title'),
          state: z.string().describe('Issue state'),
          author: z.string().describe('Issue author login'),
          assignees: z.array(z.string()).describe('Assigned usernames'),
          labels: z.array(z.string()).describe('Label names'),
          fieldValues: z
            .array(
              z.object({
                field: z.string().describe('Custom issue field name'),
                value: z.string().describe('Custom issue field value')
              })
            )
            .describe('Custom issue field values'),
          commentsCount: z.number().describe('Number of comments'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          htmlUrl: z.string().describe('URL to the issue on GitHub')
        })
      ),
      totalCount: z.number().describe('Total number of matching issues'),
      pageInfo: z.object({
        hasNextPage: z.boolean().describe('Whether another page is available'),
        hasPreviousPage: z.boolean().describe('Whether a previous page is available'),
        startCursor: z.string().nullable().describe('Cursor for the first returned issue'),
        endCursor: z.string().nullable().describe('Cursor for the last returned issue')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let items = await client.listIssues(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      labels: ctx.input.labels,
      orderBy: ctx.input.orderBy,
      direction: ctx.input.direction,
      since: ctx.input.since,
      perPage: ctx.input.perPage,
      after: ctx.input.after,
      fieldFilters: ctx.input.field_filters?.map(filter => ({
        fieldName: filter.field_name,
        value: filter.value
      }))
    });

    let issues = items.nodes.map(issue => ({
      issueNumber: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.author?.login ?? '',
      assignees: issue.assignees.nodes.map(assignee => assignee.login),
      labels: issue.labels.nodes.map(label => label.name),
      fieldValues: issue.fieldValues,
      commentsCount: issue.comments.totalCount,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      htmlUrl: issue.url
    }));

    return {
      output: { issues, totalCount: items.totalCount, pageInfo: items.pageInfo },
      message: `Found **${items.totalCount}** matching issues in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
