import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project to organize forms in your Basin account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project.')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the created project.'),
      name: z.string().describe('Project name.'),
      createdAt: z.string().describe('Creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.createProject({ name: ctx.input.name });

    return {
      output: {
        projectId: project.id,
        name: project.name ?? '',
        createdAt: project.created_at ?? ''
      },
      message: `Created project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Rename an existing project in your Basin account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update.'),
      name: z.string().describe('New name for the project.')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID.'),
      name: z.string().describe('Updated project name.'),
      updatedAt: z.string().describe('Last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.updateProject(ctx.input.projectId, { name: ctx.input.name });

    return {
      output: {
        projectId: project.id,
        name: project.name ?? '',
        updatedAt: project.updated_at ?? ''
      },
      message: `Updated project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project. Forms associated with the project will be disassociated but not deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to delete.')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the deleted project.'),
      deleted: z.boolean().describe('Whether the deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteProject(ctx.input.projectId);

    return {
      output: {
        projectId: ctx.input.projectId,
        deleted: true
      },
      message: `Deleted project **#${ctx.input.projectId}**.`
    };
  })
  .build();
