import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing issue's fields including title, content, status, priority, kind, assignee, component, milestone, and version.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      issueId: z.coerce.number().describe('Issue ID to update'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New body content (Markdown)'),
      status: z
        .enum([
          'new',
          'open',
          'resolved',
          'on hold',
          'invalid',
          'duplicate',
          'wontfix',
          'closed'
        ])
        .optional()
        .describe('Issue status'),
      priority: z
        .enum(['trivial', 'minor', 'major', 'critical', 'blocker'])
        .optional()
        .describe('Issue priority'),
      kind: z
        .enum(['bug', 'enhancement', 'proposal', 'task'])
        .optional()
        .describe('Issue type'),
      assigneeUuid: z.string().optional().describe('Assignee user UUID'),
      component: z.string().optional().describe('Component name'),
      milestone: z.string().optional().describe('Milestone name'),
      version: z.string().optional().describe('Version name')
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

    let body: Record<string, any> = {};
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.content) body.content = { raw: ctx.input.content };
    if (ctx.input.status) body.state = ctx.input.status;
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.kind) body.kind = ctx.input.kind;
    if (ctx.input.assigneeUuid) body.assignee = { uuid: ctx.input.assigneeUuid };
    if (ctx.input.component) body.component = { name: ctx.input.component };
    if (ctx.input.milestone) body.milestone = { name: ctx.input.milestone };
    if (ctx.input.version) body.version = { name: ctx.input.version };

    let issue = await client.updateIssue(ctx.input.repoSlug, ctx.input.issueId, body);

    return {
      output: {
        issueId: issue.id,
        title: issue.title,
        status: issue.state || undefined,
        htmlUrl: issue.links?.html?.href || undefined
      },
      message: `Updated issue **#${issue.id}: ${issue.title}**.`
    };
  })
  .build();
