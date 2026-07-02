import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, retrieve, list, or delete Rollbar projects. Projects represent individual deployable apps or services. Use the \`action\` field to specify the operation.
Requires an **account-level** access token for create, list, and delete operations.`,
  instructions: [
    'Use action "list" to see all projects in the account.',
    'Use action "get" with a projectId to get details of a specific project.',
    'Use action "create" with a name to create a new project.',
    'Use action "delete" with a projectId to delete a project.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      projectId: z
        .number()
        .optional()
        .describe('Project ID (required for "get" and "delete" actions)'),
      name: z.string().optional().describe('Project name (required for "create" action)')
    })
  )
  .output(
    z.object({
      project: z
        .object({
          projectId: z.number().describe('Project ID'),
          name: z.string().describe('Project name'),
          status: z.string().optional().describe('Project status'),
          accountId: z.number().optional().describe('Account ID'),
          dateCreated: z.number().optional().describe('Unix timestamp of creation'),
          dateModified: z.number().optional().describe('Unix timestamp of last modification')
        })
        .optional()
        .describe('Single project (for get/create)'),
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Project ID'),
            name: z.string().describe('Project name'),
            status: z.string().optional().describe('Project status'),
            accountId: z.number().optional().describe('Account ID'),
            dateCreated: z.number().optional().describe('Unix timestamp of creation'),
            dateModified: z.number().optional().describe('Unix timestamp of last modification')
          })
        )
        .optional()
        .describe('List of projects (for list action)'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapProject = (p: any) => ({
      projectId: p.id,
      name: p.name,
      status: p.status,
      accountId: p.account_id,
      dateCreated: p.date_created,
      dateModified: p.date_modified
    });

    if (ctx.input.action === 'list') {
      let result = await client.listProjects();
      let projects = (result?.result || []).map(mapProject);
      return {
        output: { projects },
        message: `Found **${projects.length}** projects.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.projectId) throw new Error('projectId is required for "get" action');
      let result = await client.getProject(ctx.input.projectId);
      let project = mapProject(result?.result);
      return {
        output: { project },
        message: `Retrieved project **${project.name}** (ID: ${project.projectId}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');
      let result = await client.createProject({ name: ctx.input.name });
      let project = mapProject(result?.result);
      return {
        output: { project },
        message: `Created project **${project.name}** (ID: ${project.projectId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.projectId) throw new Error('projectId is required for "delete" action');
      await client.deleteProject(ctx.input.projectId);
      return {
        output: { deleted: true },
        message: `Deleted project with ID **${ctx.input.projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
