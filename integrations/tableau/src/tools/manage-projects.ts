import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `List, create, update, or delete projects. Projects organize workbooks, data sources, and other content in Tableau.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      projectId: z.string().optional().describe('Project LUID (required for update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Project name (required for create, optional for update)'),
      description: z.string().optional().describe('Project description'),
      parentProjectId: z
        .string()
        .optional()
        .describe('Parent project LUID for nested projects'),
      contentPermissions: z
        .enum(['ManagedByOwner', 'LockedToProject', 'LockedToProjectWithoutNested'])
        .optional()
        .describe('Content permission model'),
      pageSize: z.number().optional().describe('Number of items per page'),
      pageNumber: z.number().optional().describe('Page number (1-based)'),
      filter: z.string().optional().describe('Filter expression for list'),
      sort: z.string().optional().describe('Sort expression for list')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            parentProjectId: z.string().optional(),
            contentPermissions: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      project: z
        .object({
          projectId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          parentProjectId: z.string().optional(),
          contentPermissions: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryProjects({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let pagination = result.pagination || {};
      let projects = (result.projects?.project || []).map((p: any) => ({
        projectId: p.id,
        name: p.name,
        description: p.description,
        parentProjectId: p.parentProjectId,
        contentPermissions: p.contentPermissions,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      return {
        output: { projects, totalCount: Number(pagination.totalAvailable || 0) },
        message: `Found **${projects.length}** projects (${pagination.totalAvailable || 0} total).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw tableauServiceError('name is required for create action.');

      let p = await client.createProject(ctx.input.name, {
        description: ctx.input.description,
        parentProjectId: ctx.input.parentProjectId,
        contentPermissions: ctx.input.contentPermissions
      });
      return {
        output: {
          project: {
            projectId: p.id,
            name: p.name,
            description: p.description,
            parentProjectId: p.parentProjectId,
            contentPermissions: p.contentPermissions
          }
        },
        message: `Created project **${p.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.projectId) {
        throw tableauServiceError('projectId is required for update action.');
      }
      if (
        ctx.input.name === undefined &&
        ctx.input.description === undefined &&
        ctx.input.parentProjectId === undefined &&
        ctx.input.contentPermissions === undefined
      ) {
        throw tableauServiceError('Provide at least one field to update a project.');
      }

      let p = await client.updateProject(ctx.input.projectId, {
        name: ctx.input.name,
        description: ctx.input.description,
        parentProjectId: ctx.input.parentProjectId,
        contentPermissions: ctx.input.contentPermissions
      });
      return {
        output: {
          project: {
            projectId: p.id,
            name: p.name,
            description: p.description,
            parentProjectId: p.parentProjectId,
            contentPermissions: p.contentPermissions
          }
        },
        message: `Updated project **${p.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.projectId) {
        throw tableauServiceError('projectId is required for delete action.');
      }

      await client.deleteProject(ctx.input.projectId);
      return {
        output: { deleted: true },
        message: `Deleted project \`${ctx.input.projectId}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
