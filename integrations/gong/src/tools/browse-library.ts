import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let libraryFolderSchema = z.object({
  folderId: z.string().optional().describe('Folder ID'),
  folderName: z.string().optional().describe('Folder name'),
  description: z.string().optional().describe('Folder description'),
  parentFolderId: z.string().optional().describe('Parent folder ID'),
  creatorUserId: z.string().optional().describe('Creator user ID')
});

export let browseLibrary = SlateTool.create(spec, {
  name: 'Browse Library',
  key: 'browse_library',
  description: `Browse Gong's call library. Retrieve library folders and optionally list calls within a specific folder. Use to navigate and discover organized call recordings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .optional()
        .describe('Folder ID to list calls from (omit to list all folders)'),
      workspaceId: z.string().optional().describe('Filter folders by workspace')
    })
  )
  .output(
    z.object({
      folders: z
        .array(libraryFolderSchema)
        .optional()
        .describe('Library folders (when no folderId is provided)'),
      calls: z
        .array(
          z.object({
            callId: z.string().optional().describe('Call ID'),
            title: z.string().optional().describe('Call title'),
            started: z.string().optional().describe('Call start time')
          })
        )
        .optional()
        .describe('Calls in the specified folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    if (ctx.input.folderId) {
      let result = await client.getLibraryFolderCalls(ctx.input.folderId);
      let calls = (result.calls || result.callIds || []).map((c: any) => {
        if (typeof c === 'string') return { callId: c };
        return {
          callId: c.id || c.callId,
          title: c.title,
          started: c.started
        };
      });

      return {
        output: { calls },
        message: `Retrieved ${calls.length} call(s) from folder **${ctx.input.folderId}**.`
      };
    }

    let result = await client.getLibraryFolders({
      workspaceId: ctx.input.workspaceId
    });

    let folders = (result.libraryFolders || result.folders || []).map((f: any) => ({
      folderId: f.id || f.folderId,
      folderName: f.name || f.folderName,
      description: f.description,
      parentFolderId: f.parentFolderId,
      creatorUserId: f.creatorUserId
    }));

    return {
      output: { folders },
      message: `Retrieved ${folders.length} library folder(s).`
    };
  })
  .build();
