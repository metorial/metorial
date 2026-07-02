import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `Manage Render projects and environments. Supports **list**, **get**, **create**, **update**, and **delete** for projects. Also supports **list_environments** and **create_environment** within a project.`
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_environments',
          'create_environment'
        ])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe(
          'Project ID (required for get/update/delete/list_environments/create_environment)'
        ),
      ownerId: z.string().optional().describe('Workspace ID (for list/create)'),
      name: z.string().optional().describe('Project or environment name (for create/update)'),
      description: z.string().optional().describe('Project description (for create/update)'),
      environmentId: z.string().optional().describe('Environment ID'),
      limit: z.number().optional().describe('Max results for list'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project ID'),
            name: z.string().describe('Project name'),
            ownerId: z.string().optional().describe('Workspace ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of projects'),
      project: z
        .object({
          projectId: z.string().describe('Project ID'),
          name: z.string().optional().describe('Project name'),
          ownerId: z.string().optional().describe('Workspace ID')
        })
        .optional()
        .describe('Project details'),
      environments: z
        .array(
          z.object({
            environmentId: z.string().describe('Environment ID'),
            name: z.string().describe('Environment name'),
            projectId: z.string().optional().describe('Parent project ID')
          })
        )
        .optional()
        .describe('List of environments'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, projectId } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listProjects(params);
      let projects = (data as any[]).map((item: any) => {
        let p = item.project || item;
        return { projectId: p.id, name: p.name, ownerId: p.ownerId, createdAt: p.createdAt };
      });
      return {
        output: { projects, success: true },
        message: `Found **${projects.length}** project(s).${projects.map(p => `\n- **${p.name}** (\`${p.projectId}\`)`).join('')}`
      };
    }

    if (action === 'create') {
      if (!ctx.input.ownerId) throw new Error('ownerId is required for create');
      if (!ctx.input.name) throw new Error('name is required for create');
      let body: Record<string, any> = { ownerId: ctx.input.ownerId, name: ctx.input.name };
      if (ctx.input.description) body.description = ctx.input.description;
      let p = await client.createProject(body);
      return {
        output: {
          project: { projectId: p.id, name: p.name, ownerId: p.ownerId },
          success: true
        },
        message: `Created project **${p.name}** (\`${p.id}\`).`
      };
    }

    if (!projectId) throw new Error('projectId is required');

    if (action === 'get') {
      let p = await client.getProject(projectId);
      return {
        output: {
          project: { projectId: p.id, name: p.name, ownerId: p.ownerId },
          success: true
        },
        message: `Project **${p.name}** (\`${p.id}\`).`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.description) body.description = ctx.input.description;
      let p = await client.updateProject(projectId, body);
      return {
        output: { project: { projectId: p.id, name: p.name }, success: true },
        message: `Updated project **${p.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteProject(projectId);
      return {
        output: { success: true },
        message: `Deleted project \`${projectId}\`.`
      };
    }

    if (action === 'list_environments') {
      let params: Record<string, any> = {};
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listEnvironments(projectId, params);
      let environments = (data as any[]).map((item: any) => {
        let e = item.environment || item;
        return { environmentId: e.id, name: e.name, projectId: e.projectId };
      });
      return {
        output: { environments, success: true },
        message: `Found **${environments.length}** environment(s) in project \`${projectId}\`.`
      };
    }

    if (action === 'create_environment') {
      if (!ctx.input.name) throw new Error('name is required for create_environment');
      let e = await client.createEnvironment(projectId, { name: ctx.input.name });
      return {
        output: {
          environments: [{ environmentId: e.id, name: e.name, projectId: e.projectId }],
          success: true
        },
        message: `Created environment **${e.name}** in project \`${projectId}\`.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
