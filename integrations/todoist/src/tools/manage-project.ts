import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Project name'),
  color: z.string().describe('Project color'),
  parentId: z.string().nullable().describe('Parent project ID'),
  commentCount: z.number().describe('Number of comments'),
  isShared: z.boolean().describe('Whether project is shared'),
  isFavorite: z.boolean().describe('Whether project is favorited'),
  viewStyle: z.string().describe('View style (list, board, calendar)'),
  url: z.string().describe('Project URL')
});

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Todoist. Supports nesting under a parent project, color customization, and view style configuration.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      parentId: z.string().optional().describe('Parent project ID for nesting'),
      color: z.string().optional().describe('Color name (e.g. "berry_red", "blue", "green")'),
      isFavorite: z.boolean().optional().describe('Mark as favorite'),
      viewStyle: z
        .enum(['list', 'board', 'calendar'])
        .optional()
        .describe('Project view style')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let project = await client.createProject(ctx.input);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        color: project.color,
        parentId: project.parentId,
        commentCount: project.commentCount,
        isShared: project.isShared,
        isFavorite: project.isFavorite,
        viewStyle: project.viewStyle,
        url: project.url
      },
      message: `Created project **"${project.name}"** (ID: ${project.id}).`
    };
  });

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's name, color, favorite status, or view style. Can also archive or unarchive a project.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to update'),
      name: z.string().optional().describe('New project name'),
      color: z.string().optional().describe('New color name'),
      isFavorite: z.boolean().optional().describe('Favorite status'),
      viewStyle: z.enum(['list', 'board', 'calendar']).optional().describe('View style'),
      archive: z.boolean().optional().describe('Set true to archive, false to unarchive')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Updated project ID'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { projectId, archive, ...updateData } = ctx.input;

    if (archive === true) {
      await client.archiveProject(projectId);
      return {
        output: { projectId, action: 'archived' },
        message: `Archived project (ID: ${projectId}).`
      };
    }

    if (archive === false) {
      await client.unarchiveProject(projectId);
      return {
        output: { projectId, action: 'unarchived' },
        message: `Unarchived project (ID: ${projectId}).`
      };
    }

    let project = await client.updateProject(projectId, updateData);
    return {
      output: { projectId: project.id, action: 'updated' },
      message: `Updated project **"${project.name}"** (ID: ${project.id}).`
    };
  });

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project and all its tasks. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to delete')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Deleted project ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { projectId: ctx.input.projectId },
      message: `Deleted project (ID: ${ctx.input.projectId}).`
    };
  });
