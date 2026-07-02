import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIssuesTool = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `List issues from a repository's built-in issue tracker. Filter using Bitbucket's query language for status, priority, assignee, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      query: z
        .string()
        .optional()
        .describe('Bitbucket query filter (e.g. status="open" AND priority="critical")'),
      sort: z.string().optional().describe('Sort field (e.g. "-priority", "created_on")'),
      page: z.number().optional().describe('Page number'),
      pageLen: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueId: z.number(),
          title: z.string(),
          status: z.string().optional(),
          priority: z.string().optional(),
          kind: z.string().optional(),
          assignee: z.string().optional(),
          reporter: z.string().optional(),
          createdOn: z.string().optional(),
          updatedOn: z.string().optional(),
          htmlUrl: z.string().optional()
        })
      ),
      totalCount: z.number().optional(),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let result = await client.listIssues(ctx.input.repoSlug, {
      query: ctx.input.query,
      sort: ctx.input.sort,
      page: ctx.input.page,
      pageLen: ctx.input.pageLen
    });

    let issues = (result.values || []).map((i: any) => ({
      issueId: i.id,
      title: i.title,
      status: i.state || undefined,
      priority: i.priority || undefined,
      kind: i.kind || undefined,
      assignee: i.assignee?.display_name || undefined,
      reporter: i.reporter?.display_name || undefined,
      createdOn: i.created_on,
      updatedOn: i.updated_on,
      htmlUrl: i.links?.html?.href || undefined
    }));

    return {
      output: {
        issues,
        totalCount: result.size,
        hasNextPage: !!result.next
      },
      message: `Found **${issues.length}** issues.`
    };
  })
  .build();
