import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders & Projects',
  key: 'list_folders',
  description: `List folders and projects in Wrike. Can retrieve the full folder tree, folders within a specific parent, specific folders by ID, or filter to only projects. Projects are folders with additional properties like owners, dates, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parentFolderId: z.string().optional().describe('Parent folder ID to list children of'),
      folderIds: z
        .array(z.string())
        .optional()
        .describe('Specific folder/project IDs to retrieve'),
      spaceId: z.string().optional().describe('Space ID to list folders from'),
      projectsOnly: z
        .boolean()
        .optional()
        .describe('If true, only return projects (not plain folders)'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Additional fields to include: description, briefDescription, customFields, etc.'
        )
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.string(),
          title: z.string(),
          scope: z.string(),
          childIds: z.array(z.string()).optional(),
          parentIds: z.array(z.string()).optional(),
          permalink: z.string().optional(),
          description: z.string().optional(),
          isProject: z.boolean(),
          project: z
            .object({
              status: z.string(),
              ownerIds: z.array(z.string()).optional(),
              startDate: z.string().optional(),
              endDate: z.string().optional()
            })
            .optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result: any;
    if (ctx.input.spaceId) {
      result = await client.getFolderTree({ spaceId: ctx.input.spaceId });
    } else {
      result = await client.getFolders({
        folderId: ctx.input.parentFolderId,
        folderIds: ctx.input.folderIds,
        fields: ctx.input.fields,
        project: ctx.input.projectsOnly
      });
    }

    let folders = result.data.map((f: any) => ({
      folderId: f.id,
      title: f.title,
      scope: f.scope,
      childIds: f.childIds,
      parentIds: f.parentIds,
      permalink: f.permalink,
      description: f.description,
      isProject: !!f.project,
      project: f.project
        ? {
            status: f.project.status,
            ownerIds: f.project.ownerIds,
            startDate: f.project.startDate,
            endDate: f.project.endDate
          }
        : undefined
    }));

    return {
      output: { folders, count: folders.length },
      message: `Found **${folders.length}** folder(s)/project(s).`
    };
  })
  .build();
