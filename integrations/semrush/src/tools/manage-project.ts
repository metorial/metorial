import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushV4Client } from '../lib/v4-client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, delete, or list Semrush projects. Projects are the foundation for position tracking, site audits, and other campaign-based tools.
Requires OAuth 2.0 authentication and an SEO Business subscription.`,
  instructions: [
    'Use action "list" to get all projects, "get" to retrieve a specific project, "create" to add a new one, "update" to modify, or "delete" to remove.',
    'A domain is required when creating a project.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for get, update, delete)'),
      domain: z.string().optional().describe('Domain for the project (required for create)'),
      projectName: z
        .string()
        .optional()
        .describe('Name for the project (optional for create/update)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of projects (for list action)'),
      project: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single project details (for get/create/update)'),
      deleted: z.boolean().optional().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushV4Client({
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let projects = await client.listProjects();
        return {
          output: { projects },
          message: `Found ${projects.length} projects.`
        };
      }

      case 'get': {
        if (!ctx.input.projectId) throw new Error('projectId is required for get action.');
        let project = await client.getProject(ctx.input.projectId);
        return {
          output: { project },
          message: `Retrieved project **${ctx.input.projectId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.domain) throw new Error('domain is required for create action.');
        let project = await client.createProject({
          domain: ctx.input.domain,
          name: ctx.input.projectName
        });
        return {
          output: { project },
          message: `Created project for **${ctx.input.domain}**.`
        };
      }

      case 'update': {
        if (!ctx.input.projectId) throw new Error('projectId is required for update action.');
        let project = await client.updateProject(ctx.input.projectId, {
          name: ctx.input.projectName,
          domain: ctx.input.domain
        });
        return {
          output: { project },
          message: `Updated project **${ctx.input.projectId}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.projectId) throw new Error('projectId is required for delete action.');
        await client.deleteProject(ctx.input.projectId);
        return {
          output: { deleted: true },
          message: `Deleted project **${ctx.input.projectId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
