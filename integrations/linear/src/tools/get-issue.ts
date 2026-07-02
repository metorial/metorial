import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';

export let getIssueTool = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieves a single Linear issue by ID with full details including sub-issues and comments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueId: z.string().describe('Issue ID (UUID or identifier like ENG-123)')
    })
  )
  .output(
    z.object({
      issueId: z.string(),
      identifier: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      priority: z.number(),
      priorityLabel: z.string(),
      estimate: z.number().nullable(),
      dueDate: z.string().nullable(),
      url: z.string(),
      teamId: z.string(),
      teamName: z.string(),
      stateId: z.string(),
      stateName: z.string(),
      stateType: z.string(),
      assigneeId: z.string().nullable(),
      assigneeName: z.string().nullable(),
      assigneeEmail: z.string().nullable(),
      creatorId: z.string().nullable(),
      creatorName: z.string().nullable(),
      projectId: z.string().nullable(),
      projectName: z.string().nullable(),
      cycleId: z.string().nullable(),
      cycleName: z.string().nullable(),
      parentId: z.string().nullable(),
      parentIdentifier: z.string().nullable(),
      labels: z.array(
        z.object({
          labelId: z.string(),
          name: z.string(),
          color: z.string()
        })
      ),
      subIssues: z.array(
        z.object({
          issueId: z.string(),
          identifier: z.string(),
          title: z.string(),
          priority: z.number(),
          stateName: z.string(),
          assigneeName: z.string().nullable()
        })
      ),
      comments: z.array(
        z.object({
          commentId: z.string(),
          body: z.string(),
          authorName: z.string().nullable(),
          authorEmail: z.string().nullable(),
          createdAt: z.string()
        })
      ),
      createdAt: z.string(),
      updatedAt: z.string(),
      completedAt: z.string().nullable(),
      canceledAt: z.string().nullable(),
      archivedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let issue = await client.getIssue(ctx.input.issueId);

    let output = {
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description || null,
      priority: issue.priority ?? 0,
      priorityLabel: issue.priorityLabel || 'No priority',
      estimate: issue.estimate ?? null,
      dueDate: issue.dueDate || null,
      url: issue.url,
      teamId: issue.team?.id || '',
      teamName: issue.team?.name || '',
      stateId: issue.state?.id || '',
      stateName: issue.state?.name || '',
      stateType: issue.state?.type || '',
      assigneeId: issue.assignee?.id || null,
      assigneeName: issue.assignee?.displayName || issue.assignee?.name || null,
      assigneeEmail: issue.assignee?.email || null,
      creatorId: issue.creator?.id || null,
      creatorName: issue.creator?.name || null,
      projectId: issue.project?.id || null,
      projectName: issue.project?.name || null,
      cycleId: issue.cycle?.id || null,
      cycleName: issue.cycle?.name || null,
      parentId: issue.parent?.id || null,
      parentIdentifier: issue.parent?.identifier || null,
      labels: (issue.labels?.nodes || []).map((l: any) => ({
        labelId: l.id,
        name: l.name,
        color: l.color
      })),
      subIssues: (issue.children?.nodes || []).map((c: any) => ({
        issueId: c.id,
        identifier: c.identifier,
        title: c.title,
        priority: c.priority ?? 0,
        stateName: c.state?.name || '',
        assigneeName: c.assignee?.name || null
      })),
      comments: (issue.comments?.nodes || []).map((c: any) => ({
        commentId: c.id,
        body: c.body,
        authorName: c.user?.displayName || c.user?.name || null,
        authorEmail: c.user?.email || null,
        createdAt: c.createdAt
      })),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      completedAt: issue.completedAt || null,
      canceledAt: issue.canceledAt || null,
      archivedAt: issue.archivedAt || null
    };

    return {
      output,
      message: `Retrieved issue **${issue.identifier}**: ${issue.title} (${issue.state?.name || 'Unknown state'})`
    };
  })
  .build();
