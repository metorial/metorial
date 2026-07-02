import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProjectsTool = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `List, create, update, or delete projects in the workspace.
Projects organize repositories into logical groups. Use action "list" to browse, "create"/"update" to manage, or "delete" to remove.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      projectKey: z
        .string()
        .optional()
        .describe('Project key (required for update/delete, used as identifier for create)'),
      name: z.string().optional().describe('Project name (for create/update)'),
      description: z.string().optional().describe('Project description (for create/update)'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Whether the project is private (for create/update)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageLen: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectKey: z.string(),
            name: z.string(),
            description: z.string().optional(),
            isPrivate: z.boolean().optional(),
            createdOn: z.string().optional(),
            updatedOn: z.string().optional(),
            htmlUrl: z.string().optional()
          })
        )
        .optional(),
      project: z
        .object({
          projectKey: z.string(),
          name: z.string(),
          description: z.string().optional(),
          isPrivate: z.boolean().optional(),
          htmlUrl: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list') {
      let result = await client.listProjects({
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      });

      let projects = (result.values || []).map((p: any) => ({
        projectKey: p.key,
        name: p.name,
        description: p.description || undefined,
        isPrivate: p.is_private,
        createdOn: p.created_on,
        updatedOn: p.updated_on,
        htmlUrl: p.links?.html?.href || undefined
      }));

      return {
        output: { projects, hasNextPage: !!result.next },
        message: `Found **${projects.length}** projects.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectKey || !ctx.input.name) {
        throw bitbucketServiceError('projectKey and name are required to create a project');
      }

      let body: Record<string, any> = {
        key: ctx.input.projectKey,
        name: ctx.input.name
      };
      if (ctx.input.description) body.description = ctx.input.description;
      if (ctx.input.isPrivate !== undefined) body.is_private = ctx.input.isPrivate;

      let p = await client.createProject(body);

      return {
        output: {
          project: {
            projectKey: p.key,
            name: p.name,
            description: p.description || undefined,
            isPrivate: p.is_private,
            htmlUrl: p.links?.html?.href || undefined
          }
        },
        message: `Created project **${p.name}** (${p.key}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectKey) {
        throw bitbucketServiceError('projectKey is required for update');
      }

      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.isPrivate !== undefined) body.is_private = ctx.input.isPrivate;

      let p = await client.updateProject(ctx.input.projectKey, body);

      return {
        output: {
          project: {
            projectKey: p.key,
            name: p.name,
            description: p.description || undefined,
            isPrivate: p.is_private,
            htmlUrl: p.links?.html?.href || undefined
          }
        },
        message: `Updated project **${p.name}** (${p.key}).`
      };
    }

    // delete
    if (!ctx.input.projectKey) {
      throw bitbucketServiceError('projectKey is required for delete');
    }

    await client.deleteProject(ctx.input.projectKey);

    return {
      output: { deleted: true },
      message: `Deleted project **${ctx.input.projectKey}**.`
    };
  })
  .build();
