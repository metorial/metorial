import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder or Project',
  key: 'create_folder',
  description: `Create a new folder or project under a parent folder. To create a project, provide the project configuration with owners, status, and dates. Without project configuration, a plain folder is created.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parentFolderId: z
        .string()
        .describe('Parent folder ID to create the folder/project under'),
      title: z.string().describe('Folder or project title'),
      description: z.string().optional().describe('Folder/project description'),
      shareds: z.array(z.string()).optional().describe('Contact IDs to share the folder with'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values'),
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
        .describe('Project configuration; if provided, creates a project instead of a folder')
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

    let folder = await client.createFolder(ctx.input.parentFolderId, {
      title: ctx.input.title,
      description: ctx.input.description,
      shareds: ctx.input.shareds,
      customFields: ctx.input.customFields?.map(cf => ({ id: cf.fieldId, value: cf.value })),
      project: ctx.input.project
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
      message: `Created ${isProject ? 'project' : 'folder'} **${folder.title}** (${folder.id}).`
    };
  })
  .build();
