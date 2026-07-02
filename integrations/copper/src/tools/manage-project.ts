import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.number().describe('Unique ID of the project'),
  name: z.string().nullable().describe('Project name'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  status: z.string().nullable().optional().describe('Project status: "Open" or "Completed"'),
  details: z.string().nullable().optional().describe('Project details/description'),
  tags: z.array(z.string()).optional().describe('Tags'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)'),
  customFields: z.array(z.any()).optional().describe('Custom field values')
});

let mapProject = (p: any) => ({
  projectId: p.id,
  name: p.name,
  assigneeId: p.assignee_id,
  status: p.status,
  details: p.details,
  tags: p.tags,
  dateCreated: p.date_created,
  dateModified: p.date_modified,
  customFields: p.custom_fields
});

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Copper CRM. Projects track work beyond the sales pipeline and can be related to people, companies, and opportunities.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      assigneeId: z.number().optional().describe('User ID to assign the project to'),
      status: z.string().optional().describe('Status: "Open" or "Completed"'),
      details: z.string().optional().describe('Project description or notes'),
      tags: z.array(z.string()).optional().describe('Tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.details) body.details = ctx.input.details;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let project = await client.createProject(body);

    return {
      output: mapProject(project),
      message: `Created project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve a project record by its ID. Returns full project details including status, tags, and custom fields.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to retrieve')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let project = await client.getProject(ctx.input.projectId);

    return {
      output: mapProject(project),
      message: `Retrieved project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Copper CRM. Only provided fields will be updated.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      name: z.string().optional().describe('Updated project name'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      status: z.string().optional().describe('Updated status: "Open" or "Completed"'),
      details: z.string().optional().describe('Updated description'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Updated custom fields')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.assigneeId !== undefined) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.details !== undefined) body.details = ctx.input.details;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let project = await client.updateProject(ctx.input.projectId, body);

    return {
      output: mapProject(project),
      message: `Updated project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project from Copper CRM. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the deleted project'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { projectId: ctx.input.projectId, deleted: true },
      message: `Deleted project with ID ${ctx.input.projectId}.`
    };
  })
  .build();

export let searchProjects = SlateTool.create(spec, {
  name: 'Search Projects',
  key: 'search_projects',
  description: `Search for projects in Copper CRM with flexible filtering. Supports filtering by name, assignee, status, tags, and more.`,
  constraints: ['Maximum 200 results per page'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Filter by project name'),
      assigneeIds: z.array(z.number()).optional().describe('Filter by assignee user IDs'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Filter by statuses: "Open" or "Completed"'),
      tags: z.array(z.string()).optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      projects: z.array(projectOutputSchema).describe('Matching project records'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      page_number: ctx.input.pageNumber,
      page_size: ctx.input.pageSize
    };
    if (ctx.input.sortBy) body.sort_by = ctx.input.sortBy;
    if (ctx.input.sortDirection) body.sort_direction = ctx.input.sortDirection;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.assigneeIds) body.assignee_ids = ctx.input.assigneeIds;
    if (ctx.input.statuses) body.statuses = ctx.input.statuses;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let projects = await client.searchProjects(body);

    return {
      output: {
        projects: projects.map(mapProject),
        count: projects.length
      },
      message: `Found **${projects.length}** projects matching the search criteria.`
    };
  })
  .build();
