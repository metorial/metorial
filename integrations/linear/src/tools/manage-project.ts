import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.string().describe('Unique project ID'),
  name: z.string().describe('Project name'),
  description: z.string().nullable().describe('Project description'),
  url: z.string().describe('URL to the project in Linear'),
  state: z.string().describe('Project status (planned, started, paused, completed, canceled)'),
  progress: z.number().describe('Completion progress as a decimal (0-1)'),
  startDate: z.string().nullable().describe('Project start date'),
  targetDate: z.string().nullable().describe('Project target date'),
  leadId: z.string().nullable().describe('Project lead user ID'),
  leadName: z.string().nullable().describe('Project lead name'),
  teams: z
    .array(
      z.object({
        teamId: z.string(),
        name: z.string(),
        key: z.string()
      })
    )
    .describe('Teams associated with the project'),
  createdAt: z.string(),
  updatedAt: z.string()
});

let mapProjectToOutput = (project: any) => ({
  projectId: project.id,
  name: project.name,
  description: project.description || null,
  url: project.url,
  state: project.state || '',
  progress: project.progress ?? 0,
  startDate: project.startDate || null,
  targetDate: project.targetDate || null,
  leadId: project.lead?.id || null,
  leadName: project.lead?.name || null,
  teams: (project.teams?.nodes || []).map((t: any) => ({
    teamId: t.id,
    name: t.name,
    key: t.key
  })),
  createdAt: project.createdAt,
  updatedAt: project.updatedAt
});

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Creates a new project in Linear. Projects group related issues across teams and support tracking progress with milestones and target dates.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description (Markdown)'),
      teamIds: z.array(z.string()).describe('Team IDs to associate with the project'),
      leadId: z.string().optional().describe('User ID for the project lead'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      targetDate: z.string().optional().describe('Target completion date (YYYY-MM-DD)'),
      state: z
        .string()
        .optional()
        .describe('Initial state (planned, started, paused, completed, canceled)')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {
      name: ctx.input.name,
      teamIds: ctx.input.teamIds
    };

    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.leadId !== undefined) input.leadId = ctx.input.leadId;
    if (ctx.input.startDate !== undefined) input.startDate = ctx.input.startDate;
    if (ctx.input.targetDate !== undefined) input.targetDate = ctx.input.targetDate;
    if (ctx.input.state !== undefined) input.state = ctx.input.state;

    let result = await client.createProject(input);

    if (!result.success) {
      throw linearServiceError('Failed to create project');
    }

    return {
      output: mapProjectToOutput(result.project),
      message: `Created project **${result.project.name}**`
    };
  })
  .build();

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Updates an existing Linear project. Supports changing name, description, lead, dates, and state.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New description (Markdown)'),
      leadId: z
        .string()
        .nullable()
        .optional()
        .describe('New lead user ID or null to remove lead'),
      startDate: z.string().nullable().optional().describe('New start date or null to clear'),
      targetDate: z
        .string()
        .nullable()
        .optional()
        .describe('New target date or null to clear'),
      state: z
        .string()
        .optional()
        .describe('New state (planned, started, paused, completed, canceled)')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {};
    if (ctx.input.name !== undefined) input.name = ctx.input.name;
    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.leadId !== undefined) input.leadId = ctx.input.leadId;
    if (ctx.input.startDate !== undefined) input.startDate = ctx.input.startDate;
    if (ctx.input.targetDate !== undefined) input.targetDate = ctx.input.targetDate;
    if (ctx.input.state !== undefined) input.state = ctx.input.state;

    let result = await client.updateProject(ctx.input.projectId, input);

    if (!result.success) {
      throw linearServiceError('Failed to update project');
    }

    return {
      output: mapProjectToOutput(result.project),
      message: `Updated project **${result.project.name}**`
    };
  })
  .build();

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Lists all projects in the workspace with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of projects to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      projects: z.array(projectOutputSchema),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listProjects({
      first: ctx.input.first,
      after: ctx.input.after
    });

    let projects = (result.nodes || []).map(mapProjectToOutput);

    return {
      output: {
        projects,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${projects.length}** projects`
    };
  })
  .build();

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieves a single project by ID with full details including associated issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      state: z.string(),
      progress: z.number(),
      startDate: z.string().nullable(),
      targetDate: z.string().nullable(),
      leadId: z.string().nullable(),
      leadName: z.string().nullable(),
      teams: z.array(
        z.object({
          teamId: z.string(),
          name: z.string(),
          key: z.string()
        })
      ),
      issues: z.array(
        z.object({
          issueId: z.string(),
          identifier: z.string(),
          title: z.string(),
          priority: z.number(),
          stateName: z.string(),
          assigneeName: z.string().nullable()
        })
      ),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        ...mapProjectToOutput(project),
        issues: (project.issues?.nodes || []).map((i: any) => ({
          issueId: i.id,
          identifier: i.identifier,
          title: i.title,
          priority: i.priority ?? 0,
          stateName: i.state?.name || '',
          assigneeName: i.assignee?.name || null
        }))
      },
      message: `Retrieved project **${project.name}** (${project.state || 'unknown state'}, ${Math.round((project.progress || 0) * 100)}% complete)`
    };
  })
  .build();
