import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a Felt project. Projects organize maps into collections with shared visibility and permission settings.

To **create** a new project, provide name and visibility without a project ID.
To **update** an existing project, provide the project ID and the fields to change.
To **delete** a project, provide the project ID and set delete to true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Project ID (required for update and delete)'),
      name: z.string().optional().describe('Project name (required for create)'),
      visibility: z
        .enum(['workspace', 'private'])
        .optional()
        .describe('Visibility level (required for create)'),
      maxInheritedPermission: z
        .enum(['view_only', 'view_and_contribute', 'view_and_edit'])
        .optional()
        .describe('Maximum inherited permission for maps in the project'),
      delete: z.boolean().optional().describe('Set to true to delete the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      action: z.string().describe('Action performed (created, updated, deleted)'),
      name: z.string().nullable().describe('Project name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.delete && ctx.input.projectId) {
      await client.deleteProject(ctx.input.projectId);
      return {
        output: { projectId: ctx.input.projectId, action: 'deleted', name: null },
        message: `Deleted project \`${ctx.input.projectId}\`.`
      };
    }

    if (ctx.input.projectId) {
      let project = await client.updateProject(ctx.input.projectId, {
        name: ctx.input.name,
        visibility: ctx.input.visibility,
        maxInheritedPermission: ctx.input.maxInheritedPermission
      });
      return {
        output: { projectId: project.id, action: 'updated', name: project.name ?? null },
        message: `Updated project **${project.name}**.`
      };
    }

    if (!ctx.input.name || !ctx.input.visibility) {
      throw new Error('name and visibility are required to create a project');
    }

    let project = await client.createProject({
      name: ctx.input.name,
      visibility: ctx.input.visibility,
      maxInheritedPermission: ctx.input.maxInheritedPermission
    });

    return {
      output: { projectId: project.id, action: 'created', name: project.name ?? null },
      message: `Created project **${project.name}**.`
    };
  })
  .build();
