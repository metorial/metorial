import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';
import { issueOutputSchema, mapIssueToOutput } from './create-issue';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Updates an existing Linear issue. Supports changing title, description, priority, assignee, workflow state, labels, estimates, due dates, project, cycle, and parent issue. You can also archive or unarchive issues.`,
  instructions: [
    'Accepts either a UUID or a shorthand identifier like ENG-123.',
    'Only include fields you want to change.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      issueId: z.string().describe('Issue ID (UUID or identifier like ENG-123)'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New Markdown description'),
      priority: z
        .number()
        .optional()
        .describe('Priority level (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)'),
      assigneeId: z
        .string()
        .optional()
        .describe('New assignee user ID, or empty string to unassign'),
      stateId: z.string().optional().describe('New workflow state ID'),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Replace all labels with these label IDs'),
      estimate: z.number().optional().describe('New estimate points'),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe('New due date (YYYY-MM-DD) or null to clear'),
      projectId: z
        .string()
        .nullable()
        .optional()
        .describe('New project ID or null to remove from project'),
      cycleId: z
        .string()
        .nullable()
        .optional()
        .describe('New cycle ID or null to remove from cycle'),
      parentId: z
        .string()
        .nullable()
        .optional()
        .describe('New parent issue ID or null to remove parent'),
      teamId: z.string().optional().describe('Move issue to a different team')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {};

    if (ctx.input.title !== undefined) input.title = ctx.input.title;
    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.priority !== undefined) input.priority = ctx.input.priority;
    if (ctx.input.assigneeId !== undefined) input.assigneeId = ctx.input.assigneeId || null;
    if (ctx.input.stateId !== undefined) input.stateId = ctx.input.stateId;
    if (ctx.input.labelIds !== undefined) input.labelIds = ctx.input.labelIds;
    if (ctx.input.estimate !== undefined) input.estimate = ctx.input.estimate;
    if (ctx.input.dueDate !== undefined) input.dueDate = ctx.input.dueDate;
    if (ctx.input.projectId !== undefined) input.projectId = ctx.input.projectId;
    if (ctx.input.cycleId !== undefined) input.cycleId = ctx.input.cycleId;
    if (ctx.input.parentId !== undefined) input.parentId = ctx.input.parentId;
    if (ctx.input.teamId !== undefined) input.teamId = ctx.input.teamId;

    let result = await client.updateIssue(ctx.input.issueId, input);

    if (!result.success) {
      throw linearServiceError('Failed to update issue');
    }

    let issue = result.issue;
    let output = mapIssueToOutput(issue);

    return {
      output,
      message: `Updated issue **${issue.identifier}**: ${issue.title}`
    };
  })
  .build();
