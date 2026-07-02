import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateFileTool = SlateTool.create(spec, {
  name: 'Update File',
  key: 'update_file',
  description: `Update a file or folder's metadata in Google Drive. Can rename, change description, star/unstar, trash/restore, or move between folders. To move a file, specify both \`addParentIds\` and \`removeParentIds\`.`,
  instructions: [
    'To move a file from one folder to another, set addParentIds to the destination folder and removeParentIds to the source folder.',
    'For files in the root of My Drive, the source parent is often the folder ID `root` (Drive accepts this alias in addParents/removeParents). Prefer actual parent IDs from **Get File** when unsure.',
    'To trash a file, set trashed to true. To restore, set trashed to false.'
  ]
})
  .scopes(googleDriveActionScopes.updateFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to update'),
      name: z.string().optional().describe('New name for the file'),
      description: z.string().optional().describe('New description'),
      starred: z.boolean().optional().describe('Star or unstar the file'),
      trashed: z.boolean().optional().describe('Trash or restore the file'),
      addParentIds: z
        .array(z.string())
        .optional()
        .describe('Folder IDs to add as parents (move into)'),
      removeParentIds: z
        .array(z.string())
        .optional()
        .describe('Folder IDs to remove as parents (move out of)')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      name: z.string(),
      mimeType: z.string(),
      modifiedTime: z.string().optional(),
      trashed: z.boolean().optional(),
      starred: z.boolean().optional(),
      parents: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let file = await client.updateFile(ctx.input.fileId, {
      name: ctx.input.name,
      description: ctx.input.description,
      starred: ctx.input.starred,
      trashed: ctx.input.trashed,
      addParents: ctx.input.addParentIds,
      removeParents: ctx.input.removeParentIds
    });

    let actions: string[] = [];
    if (ctx.input.name) actions.push(`renamed to "${ctx.input.name}"`);
    if (ctx.input.trashed === true) actions.push('moved to trash');
    if (ctx.input.trashed === false) actions.push('restored from trash');
    if (ctx.input.starred !== undefined)
      actions.push(ctx.input.starred ? 'starred' : 'unstarred');
    if (ctx.input.addParentIds?.length) actions.push('moved to new folder');
    if (ctx.input.description !== undefined) actions.push('description updated');

    return {
      output: {
        fileId: file.fileId,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        trashed: file.trashed,
        starred: file.starred,
        parents: file.parents
      },
      message: `Updated **${file.name}**: ${actions.join(', ') || 'metadata updated'}.`
    };
  })
  .build();
