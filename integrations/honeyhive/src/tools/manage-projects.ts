import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the workspace, optionally filtering by name. Returns project IDs, names, and descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter projects by name')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique project identifier'),
            name: z.string().describe('Project name'),
            description: z.string().optional().describe('Project description')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let data = await client.listProjects(
      ctx.input.name ? { name: ctx.input.name } : undefined
    );
    let projects = Array.isArray(data) ? data : (data?.projects ?? []);

    let mapped = projects.map((p: any) => ({
      projectId: p.id || p._id,
      name: p.name,
      description: p.description
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in HoneyHive. Projects are the top-level organizational unit for traces, evaluations, datasets, and prompts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project'),
      description: z.string().optional().describe('Description of the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      name: z.string().describe('Name of the created project'),
      description: z.string().optional().describe('Description of the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let data = await client.createProject({
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        projectId: data.id || data._id,
        name: data.name,
        description: data.description
      },
      message: `Created project **${data.name}**.`
    };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's name or description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New name for the project'),
      description: z.string().optional().describe('New description for the project')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.updateProject({
      project_id: ctx.input.projectId,
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { success: true },
      message: `Updated project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Delete a project by name. This removes the project and all associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.deleteProject(ctx.input.name);

    return {
      output: { success: true },
      message: `Deleted project **${ctx.input.name}**.`
    };
  })
  .build();
