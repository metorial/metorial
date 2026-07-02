import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

let issueOutputSchema = z.object({
  issueId: z.string().describe('Unique ID of the issue'),
  identifier: z.string().describe('Human-readable identifier like ENG-123'),
  title: z.string().describe('Title of the issue'),
  description: z.string().nullable().describe('Markdown description'),
  priority: z.number().describe('Priority level (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)'),
  priorityLabel: z.string().describe('Human-readable priority label'),
  estimate: z.number().nullable().describe('Estimate points'),
  dueDate: z.string().nullable().describe('Due date'),
  url: z.string().describe('URL to the issue in Linear'),
  teamId: z.string().describe('Team ID'),
  teamName: z.string().describe('Team name'),
  stateId: z.string().describe('Workflow state ID'),
  stateName: z.string().describe('Workflow state name'),
  assigneeId: z.string().nullable().describe('Assignee user ID'),
  assigneeName: z.string().nullable().describe('Assignee name'),
  projectId: z.string().nullable().describe('Associated project ID'),
  projectName: z.string().nullable().describe('Associated project name'),
  labels: z
    .array(
      z.object({
        labelId: z.string(),
        name: z.string(),
        color: z.string()
      })
    )
    .describe('Labels attached to the issue'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export { issueOutputSchema };

export let createIssueTool = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Creates a new issue in a Linear team. Supports setting title, description (Markdown), priority, assignee, labels, estimates, due dates, workflow state, parent issue, project, and cycle associations.`,
  instructions: [
    'The teamId is required. Use the "List Teams" tool first to get available team IDs.',
    'Priority values: 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low.',
    'Description supports Markdown formatting.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to create the issue in'),
      title: z.string().describe('Title of the issue'),
      description: z.string().optional().describe('Markdown description of the issue'),
      priority: z
        .number()
        .optional()
        .describe('Priority level (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)'),
      assigneeId: z.string().optional().describe('User ID to assign the issue to'),
      stateId: z.string().optional().describe('Workflow state ID'),
      labelIds: z.array(z.string()).optional().describe('Array of label IDs to attach'),
      estimate: z.number().optional().describe('Estimate points for the issue'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format (YYYY-MM-DD)'),
      projectId: z.string().optional().describe('Project ID to associate with'),
      cycleId: z.string().optional().describe('Cycle ID to associate with'),
      parentId: z.string().optional().describe('Parent issue ID to create as sub-issue'),
      subscriberIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to subscribe to the issue')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {
      teamId: ctx.input.teamId,
      title: ctx.input.title
    };

    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.priority !== undefined) input.priority = ctx.input.priority;
    if (ctx.input.assigneeId !== undefined) input.assigneeId = ctx.input.assigneeId;
    if (ctx.input.stateId !== undefined) input.stateId = ctx.input.stateId;
    if (ctx.input.labelIds !== undefined) input.labelIds = ctx.input.labelIds;
    if (ctx.input.estimate !== undefined) input.estimate = ctx.input.estimate;
    if (ctx.input.dueDate !== undefined) input.dueDate = ctx.input.dueDate;
    if (ctx.input.projectId !== undefined) input.projectId = ctx.input.projectId;
    if (ctx.input.cycleId !== undefined) input.cycleId = ctx.input.cycleId;
    if (ctx.input.parentId !== undefined) input.parentId = ctx.input.parentId;
    if (ctx.input.subscriberIds !== undefined) input.subscriberIds = ctx.input.subscriberIds;

    let result = await client.createIssue(input);

    if (!result.success) {
      throw linearServiceError('Failed to create issue');
    }

    let issue = result.issue;
    let output = mapIssueToOutput(issue);

    return {
      output,
      message: `Created issue **${issue.identifier}**: ${issue.title} in team ${issue.team?.name || ctx.input.teamId}`
    };
  })
  .build();

export let mapIssueToOutput = (issue: any) => ({
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
  assigneeId: issue.assignee?.id || null,
  assigneeName: issue.assignee?.displayName || issue.assignee?.name || null,
  projectId: issue.project?.id || null,
  projectName: issue.project?.name || null,
  labels: (issue.labels?.nodes || []).map((l: any) => ({
    labelId: l.id,
    name: l.name,
    color: l.color
  })),
  createdAt: issue.createdAt,
  updatedAt: issue.updatedAt
});
