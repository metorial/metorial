import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique project identifier.'),
  name: z.string().optional().describe('Project name.'),
  company: z.string().optional().describe('Associated company name.')
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Deepgram projects accessible with the current API key. Returns project IDs, names, and company information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listProjects();

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.project_id,
      name: p.name,
      company: p.company
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Get details of a specific Deepgram project including its name, company, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve.')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: result.project_id,
        name: result.name,
        company: result.company
      },
      message: `Retrieved project **${result.name || result.project_id}**.`
    };
  })
  .build();

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a Deepgram project's name.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update.'),
      name: z.string().describe('New project name.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.updateProject(ctx.input.projectId, {
      name: ctx.input.name
    });

    return {
      output: { message: result.message ?? 'Project updated successfully.' },
      message: `Updated project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let deleteProjectTool = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a Deepgram project. This action is irreversible and requires Owner-level permissions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { message: 'Project deleted successfully.' },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();
