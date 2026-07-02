import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination, mapProject } from '../lib/mappers';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  workspaceCount: z.number()
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the organization. Projects are used to organize and group workspaces.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter projects by name'),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listProjects({
      name: ctx.input.name,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let projects = (response.data || []).map(mapProject);
    let pagination = mapPagination(response.meta);

    return {
      output: { projects, pagination },
      message: `Found **${pagination.totalCount}** project(s).`
    };
  })
  .build();

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project to organize workspaces. Workspaces can be assigned to a project during creation or moved later.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      description: z.string().optional().describe('Description of the project')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createProject(ctx.input);
    let project = mapProject(response.data);

    return {
      output: project,
      message: `Created project **${project.name}** (${project.projectId}).`
    };
  })
  .build();

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a project's name or description.`
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to update'),
      name: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New project description')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { projectId, ...updates } = ctx.input;
    let response = await client.updateProject(projectId, updates);
    let project = mapProject(response.data);

    return {
      output: project,
      message: `Updated project **${project.name}** (${project.projectId}).`
    };
  })
  .build();

export let deleteProjectTool = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project. The project must have no workspaces assigned to it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Project ${ctx.input.projectId} has been deleted.`
    };
  })
  .build();
