import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new Railway project. Optionally assign it to a workspace and set a description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project'),
      description: z.string().optional().describe('Optional project description'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID to create the project in. Omit for personal projects.')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the newly created project'),
      name: z.string().describe('Project name'),
      description: z.string().nullable().describe('Project description'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let project = await client.createProject({
      name: ctx.input.name,
      description: ctx.input.description,
      workspaceId: ctx.input.workspaceId
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description ?? null,
        createdAt: project.createdAt
      },
      message: `Created project **${project.name}**.`
    };
  })
  .build();

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing Railway project's name, description, or settings like public visibility and PR deploy previews.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New project description'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the project should be publicly visible'),
      prDeploys: z.boolean().optional().describe('Whether to enable PR deploy previews')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the updated project'),
      name: z.string().describe('Updated project name'),
      description: z.string().nullable().describe('Updated project description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { projectId, ...updateInput } = ctx.input;
    let project = await client.updateProject(projectId, updateInput);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description ?? null
      },
      message: `Updated project **${project.name}**.`
    };
  })
  .build();

export let deleteProjectTool = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a Railway project and all its services, environments, and deployments. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Project deleted successfully.`
    };
  })
  .build();
