import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `Create, update, delete, or list projects in n8n. Projects group workflows and credentials for access control. Also supports managing project members.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'create',
          'update',
          'delete',
          'list_members',
          'add_members',
          'remove_member'
        ])
        .describe('The project operation to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for update, delete, and member operations)'),
      name: z.string().optional().describe('Project name (required for create and update)'),
      userId: z.string().optional().describe('User ID (required for remove_member)'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            role: z.string().describe('Role for the user in the project')
          })
        )
        .optional()
        .describe('Members to add (for add_members action)'),
      limit: z.number().optional().describe('Max results for list actions'),
      cursor: z.string().optional().describe('Pagination cursor for list actions')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project ID'),
            name: z.string().describe('Project name'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of projects'),
      project: z
        .object({
          projectId: z.string().describe('Project ID'),
          name: z.string().describe('Project name'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Single project result'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().optional().describe('User email'),
            role: z.string().optional().describe('User role in the project')
          })
        )
        .optional()
        .describe('Project members'),
      deleted: z.boolean().optional().describe('Whether deletion was successful'),
      nextCursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let mapProject = (p: any) => ({
      projectId: String(p.id),
      name: p.name || '',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listProjects({
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let projects = (result.data || []).map(mapProject);
        return {
          output: { projects, nextCursor: result.nextCursor },
          message: `Found **${projects.length}** project(s).`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('Name is required for creating a project');
        let project = await client.createProject(ctx.input.name);
        return {
          output: { project: mapProject(project) },
          message: `Created project **"${ctx.input.name}"** (ID: ${project.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.projectId)
          throw new Error('projectId is required for updating a project');
        if (!ctx.input.name) throw new Error('Name is required for updating a project');
        let project = await client.updateProject(ctx.input.projectId, {
          name: ctx.input.name
        });
        return {
          output: { project: mapProject(project) },
          message: `Updated project **${ctx.input.projectId}** to **"${ctx.input.name}"**.`
        };
      }
      case 'delete': {
        if (!ctx.input.projectId)
          throw new Error('projectId is required for deleting a project');
        await client.deleteProject(ctx.input.projectId);
        return {
          output: { deleted: true },
          message: `Deleted project **${ctx.input.projectId}**.`
        };
      }
      case 'list_members': {
        if (!ctx.input.projectId) throw new Error('projectId is required for listing members');
        let result = await client.listProjectMembers(ctx.input.projectId, {
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let members = (result.data || []).map((m: any) => ({
          userId: String(m.id || m.userId),
          email: m.email,
          role: m.role
        }));
        return {
          output: { members, nextCursor: result.nextCursor },
          message: `Found **${members.length}** member(s) in project **${ctx.input.projectId}**.`
        };
      }
      case 'add_members': {
        if (!ctx.input.projectId) throw new Error('projectId is required for adding members');
        if (!ctx.input.members || ctx.input.members.length === 0)
          throw new Error('members array is required');
        await client.addProjectMembers(ctx.input.projectId, ctx.input.members);
        return {
          output: {},
          message: `Added **${ctx.input.members.length}** member(s) to project **${ctx.input.projectId}**.`
        };
      }
      case 'remove_member': {
        if (!ctx.input.projectId)
          throw new Error('projectId is required for removing a member');
        if (!ctx.input.userId) throw new Error('userId is required for removing a member');
        await client.removeProjectMember(ctx.input.projectId, ctx.input.userId);
        return {
          output: { deleted: true },
          message: `Removed user **${ctx.input.userId}** from project **${ctx.input.projectId}**.`
        };
      }
    }
  })
  .build();
