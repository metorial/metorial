import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageIssue = SlateTool.create(spec, {
  name: 'Manage Issue',
  key: 'manage_issue',
  description: `Create, update, close, reopen, or delete a GitLab issue. Supports setting title, description, labels, assignees, milestone, due date, weight, and confidentiality. Use **stateEvent** to close or reopen an existing issue.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      projectId: z.string().describe('Project ID or URL-encoded path'),
      issueIid: z
        .number()
        .optional()
        .describe('Issue IID within the project (required for update/delete)'),
      title: z.string().optional().describe('Issue title (required for create)'),
      description: z.string().optional().describe('Issue description (Markdown supported)'),
      assigneeIds: z.array(z.number()).optional().describe('User IDs to assign'),
      milestoneId: z.number().optional().describe('Milestone ID to associate'),
      labels: z.string().optional().describe('Comma-separated list of labels'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD format)'),
      confidential: z.boolean().optional().describe('Whether the issue is confidential'),
      weight: z.number().optional().describe('Issue weight (0-9)'),
      stateEvent: z
        .enum(['close', 'reopen'])
        .optional()
        .describe('State transition: close or reopen the issue (update only)')
    })
  )
  .output(
    z.object({
      issueId: z.number().describe('Global issue ID'),
      issueIid: z.number().describe('Issue IID within the project'),
      title: z.string().describe('Issue title'),
      state: z.string().describe('Issue state (opened/closed)'),
      webUrl: z.string().describe('URL to the issue'),
      labels: z.array(z.string()).describe('Applied labels'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let issue: any;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.title) throw gitLabServiceError('Title is required for create action');
        issue = await client.createIssue(ctx.input.projectId, {
          title: ctx.input.title,
          description: ctx.input.description,
          assigneeIds: ctx.input.assigneeIds,
          milestoneId: ctx.input.milestoneId,
          labels: ctx.input.labels,
          dueDate: ctx.input.dueDate,
          confidential: ctx.input.confidential,
          weight: ctx.input.weight
        });
        break;
      }
      case 'update': {
        if (!ctx.input.issueIid)
          throw gitLabServiceError('Issue IID is required for update action');
        issue = await client.updateIssue(ctx.input.projectId, ctx.input.issueIid, {
          title: ctx.input.title,
          description: ctx.input.description,
          assigneeIds: ctx.input.assigneeIds,
          milestoneId: ctx.input.milestoneId,
          labels: ctx.input.labels,
          stateEvent: ctx.input.stateEvent,
          dueDate: ctx.input.dueDate,
          confidential: ctx.input.confidential,
          weight: ctx.input.weight
        });
        break;
      }
      case 'delete': {
        if (!ctx.input.issueIid)
          throw gitLabServiceError('Issue IID is required for delete action');
        let existing = await client.getIssue(ctx.input.projectId, ctx.input.issueIid);
        await client.deleteIssue(ctx.input.projectId, ctx.input.issueIid);
        return {
          output: {
            issueId: existing.id,
            issueIid: existing.iid,
            title: existing.title,
            state: 'deleted',
            webUrl: existing.web_url,
            labels: existing.labels || [],
            createdAt: existing.created_at,
            updatedAt: existing.updated_at
          },
          message: `Deleted issue **#${existing.iid}** — ${existing.title}`
        };
      }
    }

    let actionVerb = ctx.input.action === 'create' ? 'Created' : 'Updated';

    return {
      output: {
        issueId: issue.id,
        issueIid: issue.iid,
        title: issue.title,
        state: issue.state,
        webUrl: issue.web_url,
        labels: issue.labels || [],
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      },
      message: `${actionVerb} issue **#${issue.iid}** — [${issue.title}](${issue.web_url}) (${issue.state})`
    };
  })
  .build();
