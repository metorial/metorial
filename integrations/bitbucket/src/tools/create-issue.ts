import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createIssueTool = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new issue in a repository's built-in issue tracker. Set title, content, priority, kind, component, milestone, version, and assignee.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      title: z.string().describe('Issue title'),
      content: z.string().optional().describe('Issue body (supports Markdown)'),
      priority: z
        .enum(['trivial', 'minor', 'major', 'critical', 'blocker'])
        .optional()
        .describe('Issue priority'),
      kind: z
        .enum(['bug', 'enhancement', 'proposal', 'task'])
        .optional()
        .describe('Issue type'),
      component: z.string().optional().describe('Component name'),
      milestone: z.string().optional().describe('Milestone name'),
      version: z.string().optional().describe('Version name'),
      assigneeUuid: z.string().optional().describe('Assignee user UUID')
    })
  )
  .output(
    z.object({
      issueId: z.number(),
      title: z.string(),
      status: z.string().optional(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let body: Record<string, any> = {
      title: ctx.input.title
    };
    if (ctx.input.content) body.content = { raw: ctx.input.content };
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.kind) body.kind = ctx.input.kind;
    if (ctx.input.component) body.component = { name: ctx.input.component };
    if (ctx.input.milestone) body.milestone = { name: ctx.input.milestone };
    if (ctx.input.version) body.version = { name: ctx.input.version };
    if (ctx.input.assigneeUuid) body.assignee = { uuid: ctx.input.assigneeUuid };

    let issue = await client.createIssue(ctx.input.repoSlug, body);

    return {
      output: {
        issueId: issue.id,
        title: issue.title,
        status: issue.state || undefined,
        htmlUrl: issue.links?.html?.href || undefined
      },
      message: `Created issue **#${issue.id}: ${issue.title}**.`
    };
  })
  .build();
