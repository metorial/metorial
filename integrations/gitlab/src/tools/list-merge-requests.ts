import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { spec } from '../spec';

export let listMergeRequests = SlateTool.create(spec, {
  name: 'List Merge Requests',
  key: 'list_merge_requests',
  description: `List GitLab merge requests, optionally scoped to a project. Filter by state, labels, source/target branch, author, assignee, or reviewer. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or path. Omit for global MR list.'),
      state: z
        .enum(['opened', 'closed', 'merged', 'all'])
        .optional()
        .describe('Filter by MR state'),
      labels: z.string().optional().describe('Comma-separated label names'),
      sourceBranch: z.string().optional().describe('Filter by source branch'),
      targetBranch: z.string().optional().describe('Filter by target branch'),
      authorId: z.number().optional().describe('Filter by author user ID'),
      assigneeId: z.number().optional().describe('Filter by assignee user ID'),
      reviewerId: z.number().optional().describe('Filter by reviewer user ID'),
      search: z.string().optional().describe('Search term'),
      scope: z
        .enum(['created_by_me', 'assigned_to_me', 'all'])
        .optional()
        .describe('Scope of merge requests'),
      orderBy: z.enum(['created_at', 'updated_at']).optional().describe('Order by field'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      mergeRequests: z.array(
        z.object({
          mergeRequestId: z.number().describe('Global MR ID'),
          mergeRequestIid: z.number().describe('MR IID within the project'),
          title: z.string().describe('MR title'),
          state: z.string().describe('MR state'),
          webUrl: z.string().describe('URL to the MR'),
          sourceBranch: z.string().describe('Source branch'),
          targetBranch: z.string().describe('Target branch'),
          authorUsername: z.string().nullable().describe('Author username'),
          draft: z.boolean().describe('Whether this is a draft MR'),
          mergeStatus: z.string().nullable().describe('Merge status'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      ),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let result = await client.listMergeRequests({
      projectId: ctx.input.projectId,
      state: ctx.input.state,
      labels: ctx.input.labels,
      sourceBranch: ctx.input.sourceBranch,
      targetBranch: ctx.input.targetBranch,
      authorId: ctx.input.authorId,
      assigneeId: ctx.input.assigneeId,
      reviewerId: ctx.input.reviewerId,
      search: ctx.input.search,
      scope: ctx.input.scope,
      orderBy: ctx.input.orderBy,
      sort: ctx.input.sort,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let mergeRequests = result.mergeRequests.map((mr: any) => ({
      mergeRequestId: mr.id,
      mergeRequestIid: mr.iid,
      title: mr.title,
      state: mr.state,
      webUrl: mr.web_url,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      authorUsername: mr.author?.username || null,
      draft: mr.draft || false,
      mergeStatus: mr.merge_status || null,
      createdAt: mr.created_at,
      updatedAt: mr.updated_at
    }));

    return {
      output: { mergeRequests, totalPages: result.totalPages },
      message: `Found **${mergeRequests.length}** merge requests${ctx.input.state ? ` (${ctx.input.state})` : ''}`
    };
  })
  .build();
