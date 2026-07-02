import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPapersignFolders = SlateTool.create(spec, {
  name: 'List Papersign Folders',
  key: 'list_papersign_folders',
  description: `List all Papersign folders. Folders are used to organize eSignature documents. Also lists Papersign spaces which are the top-level organizational units.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeSpaces: z
        .boolean()
        .optional()
        .describe('Also include Papersign spaces in the response (default false)')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.number().describe('Unique folder ID'),
          name: z.string().describe('Folder name'),
          parentId: z.number().nullable().describe('Parent folder ID, null for root folders'),
          spaceId: z.number().describe('Space ID this folder belongs to')
        })
      ),
      spaces: z
        .array(
          z.object({
            spaceId: z.number().describe('Unique space ID'),
            name: z.string().describe('Space name'),
            rootFolderId: z.number().describe('Root folder ID for this space'),
            allowTeamAccess: z.boolean().describe('Whether team members can access this space')
          })
        )
        .optional()
        .describe('Papersign spaces (only included when includeSpaces is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let foldersResult = await client.listPapersignFolders();
    let folders = foldersResult.results.map(f => ({
      folderId: f.id,
      name: f.name,
      parentId: f.parent_id,
      spaceId: f.space_id
    }));

    let output: {
      folders: typeof folders;
      spaces?: Array<{
        spaceId: number;
        name: string;
        rootFolderId: number;
        allowTeamAccess: boolean;
      }>;
    } = { folders };

    if (ctx.input.includeSpaces) {
      let spacesResult = await client.listPapersignSpaces();
      output.spaces = spacesResult.results.map(s => ({
        spaceId: s.id,
        name: s.name,
        rootFolderId: s.root_folder_id,
        allowTeamAccess: s.allow_team_access
      }));
    }

    return {
      output,
      message: `Found **${folders.length}** folder(s).${output.spaces ? ` Found **${output.spaces.length}** space(s).` : ''}`
    };
  })
  .build();

export let createPapersignFolder = SlateTool.create(spec, {
  name: 'Create Papersign Folder',
  key: 'create_papersign_folder',
  description: `Create a new folder for organizing Papersign documents. Specify a parent folder or space to control the folder hierarchy.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new folder'),
      spaceId: z.number().optional().describe('Space ID to create the folder in'),
      parentId: z.number().optional().describe('Parent folder ID for nesting')
    })
  )
  .output(
    z.object({
      folderId: z.number().describe('Unique folder ID'),
      name: z.string().describe('Folder name'),
      parentId: z.number().nullable().describe('Parent folder ID'),
      spaceId: z.number().describe('Space ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let f = await client.createPapersignFolder({
      name: ctx.input.name,
      spaceId: ctx.input.spaceId,
      parentId: ctx.input.parentId
    });

    return {
      output: {
        folderId: f.id,
        name: f.name,
        parentId: f.parent_id,
        spaceId: f.space_id
      },
      message: `Created folder **${f.name}**.`
    };
  })
  .build();
