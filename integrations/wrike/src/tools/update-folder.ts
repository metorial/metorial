import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let updateFolder = SlateTool.create(spec, {
  name: 'Update Folder or Project',
  key: 'update_folder',
  description: `Update an existing folder or project's properties including title, description, sharing, custom fields, and project-specific settings like status and dates. Supports adding/removing shared users and parent folders.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('ID of the folder or project to update'),
      title: z.string().optional().describe('New folder/project title'),
      description: z.string().optional().describe('New description'),
      addShareds: z.array(z.string()).optional().describe('Contact IDs to add to sharing'),
      removeShareds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to remove from sharing'),
      addParents: z.array(z.string()).optional().describe('Folder IDs to add as parents'),
      removeParents: z
        .array(z.string())
        .optional()
        .describe('Folder IDs to remove from parents'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to set'),
      project: z
        .object({
          ownerIds: z.array(z.string()).optional().describe('Project owner contact IDs'),
          status: z
            .string()
            .optional()
            .describe('Project status: Green, Yellow, Red, Completed, OnHold, Cancelled'),
          startDate: z.string().optional().describe('Project start date (YYYY-MM-DD)'),
          endDate: z.string().optional().describe('Project end date (YYYY-MM-DD)')
        })
        .optional()
        .describe('Project configuration to update'),
      restore: z.boolean().optional().describe('Set to true to restore a deleted folder')
    })
  )
  .output(
    z.object({
      folderId: z.string(),
      title: z.string(),
      scope: z.string(),
      permalink: z.string().optional(),
      isProject: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let folder = await client.updateFolder(ctx.input.folderId, {
      title: ctx.input.title,
      description: ctx.input.description,
      addShareds: ctx.input.addShareds,
      removeShareds: ctx.input.removeShareds,
      addParents: ctx.input.addParents,
      removeParents: ctx.input.removeParents,
      customFields: ctx.input.customFields?.map(cf => ({ id: cf.fieldId, value: cf.value })),
      project: ctx.input.project,
      restore: ctx.input.restore
    });

    let isProject = !!folder.project;

    return {
      output: {
        folderId: folder.id,
        title: folder.title,
        scope: folder.scope,
        permalink: folder.permalink,
        isProject
      },
      message: `Updated ${isProject ? 'project' : 'folder'} **${folder.title}** (${folder.id}).`
    };
  })
  .build();
