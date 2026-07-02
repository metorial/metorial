import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().optional().describe('Unique project identifier'),
  slug: z.string().optional().describe('URL-friendly project slug'),
  name: z.string().optional().describe('Project display name'),
  description: z.string().optional().describe('Project description'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `List, create, retrieve, update, or delete Doppler projects. Projects are the top-level organizational unit that contain environments and configs for managing secrets.`,
  instructions: [
    'Use action "list" to retrieve all projects in the workplace.',
    'Use action "get" with a project name/slug to retrieve a specific project.',
    'Use action "create" with a name (and optional description) to create a new project.',
    'Use action "update" to rename or update the description of an existing project.',
    'Use action "delete" to permanently remove a project and all its configs/secrets.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      project: z
        .string()
        .optional()
        .describe('Project slug or name (required for get, update, delete)'),
      name: z.string().optional().describe('Project name (required for create and update)'),
      description: z
        .string()
        .optional()
        .describe('Project description (for create and update)'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Items per page for listing')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).optional().describe('List of projects'),
      project: projectSchema.optional().describe('Single project details'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let mapProject = (p: any) => ({
      projectId: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      createdAt: p.created_at
    });

    if (ctx.input.action === 'list') {
      let result = await client.listProjects({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      return {
        output: {
          projects: result.projects.map(mapProject),
          page: result.page
        },
        message: `Found **${result.projects.length}** projects (page ${result.page}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.project) throw new Error('project is required for "get" action');

      let project = await client.getProject(ctx.input.project);

      return {
        output: { project: mapProject(project) },
        message: `Retrieved project **${project.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');

      let project = await client.createProject(ctx.input.name, ctx.input.description);

      return {
        output: { project: mapProject(project) },
        message: `Created project **${project.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.project) throw new Error('project is required for "update" action');
      if (!ctx.input.name) throw new Error('name is required for "update" action');

      let project = await client.updateProject(
        ctx.input.project,
        ctx.input.name,
        ctx.input.description
      );

      return {
        output: { project: mapProject(project) },
        message: `Updated project **${project.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.project) throw new Error('project is required for "delete" action');

      await client.deleteProject(ctx.input.project);

      return {
        output: {},
        message: `Deleted project **${ctx.input.project}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
