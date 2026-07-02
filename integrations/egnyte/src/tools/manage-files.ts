import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let createFolderTool = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder at the specified path in Egnyte. All intermediate folders in the path will be created automatically if they don't exist.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderPath: z
        .string()
        .describe('Full path for the new folder (e.g. "/Shared/Projects/NewProject")')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Path of the created folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.createFolder(ctx.input.folderPath);

    return {
      output: {
        path: ctx.input.folderPath
      },
      message: `Created folder **${ctx.input.folderPath}**`
    };
  })
  .build();

export let copyItemTool = SlateTool.create(spec, {
  name: 'Copy File or Folder',
  key: 'copy_item',
  description: `Copy a file or folder to a new location in Egnyte. The destination path must include the new name. Optionally control how permissions are handled for copied folders.`
})
  .input(
    z.object({
      sourcePath: z.string().describe('Path of the source file or folder'),
      destinationPath: z.string().describe('Destination path including the new name'),
      permissions: z
        .enum(['inherit_from_parent', 'keep_original'])
        .optional()
        .describe('How to handle permissions for the copy')
    })
  )
  .output(
    z.object({
      sourcePath: z.string(),
      destinationPath: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.copyFileOrFolder(
      ctx.input.sourcePath,
      ctx.input.destinationPath,
      ctx.input.permissions
    );

    return {
      output: {
        sourcePath: ctx.input.sourcePath,
        destinationPath: ctx.input.destinationPath
      },
      message: `Copied **${ctx.input.sourcePath}** to **${ctx.input.destinationPath}**`
    };
  })
  .build();

export let moveItemTool = SlateTool.create(spec, {
  name: 'Move File or Folder',
  key: 'move_item',
  description: `Move a file or folder to a new location in Egnyte. The destination path must include the new name. Moving a folder also moves all its contents.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourcePath: z.string().describe('Path of the source file or folder'),
      destinationPath: z.string().describe('Destination path including the new name'),
      permissions: z
        .enum(['inherit_from_parent', 'keep_original'])
        .optional()
        .describe('How to handle permissions after move')
    })
  )
  .output(
    z.object({
      sourcePath: z.string(),
      destinationPath: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.moveFileOrFolder(
      ctx.input.sourcePath,
      ctx.input.destinationPath,
      ctx.input.permissions
    );

    return {
      output: {
        sourcePath: ctx.input.sourcePath,
        destinationPath: ctx.input.destinationPath
      },
      message: `Moved **${ctx.input.sourcePath}** to **${ctx.input.destinationPath}**`
    };
  })
  .build();

export let deleteItemTool = SlateTool.create(spec, {
  name: 'Delete File or Folder',
  key: 'delete_item',
  description: `Delete a file or folder in Egnyte. Items are moved to the trash and can be restored within the retention period. Optionally delete a specific file version by entry ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      path: z.string().describe('Path to the file or folder to delete'),
      entryId: z
        .string()
        .optional()
        .describe('Specific file version entry ID to delete (deletes only that version)')
    })
  )
  .output(
    z.object({
      path: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.deleteFileOrFolder(ctx.input.path, ctx.input.entryId);

    return {
      output: {
        path: ctx.input.path,
        deleted: true
      },
      message: `Deleted **${ctx.input.path}**${ctx.input.entryId ? ` (version ${ctx.input.entryId})` : ''} — moved to trash`
    };
  })
  .build();

export let lockFileTool = SlateTool.create(spec, {
  name: 'Lock or Unlock File',
  key: 'lock_file',
  description: `Lock or unlock a file in Egnyte to prevent or allow concurrent edits. Locking a file prevents other users from modifying it. A lock token is required to identify the lock.`
})
  .input(
    z.object({
      path: z.string().describe('Path to the file'),
      action: z.enum(['lock', 'unlock']).describe('Whether to lock or unlock the file'),
      lockToken: z.string().describe('Token to identify the lock (any unique string)')
    })
  )
  .output(
    z.object({
      path: z.string(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    if (ctx.input.action === 'lock') {
      await client.lockFile(ctx.input.path, ctx.input.lockToken);
    } else {
      await client.unlockFile(ctx.input.path, ctx.input.lockToken);
    }

    return {
      output: {
        path: ctx.input.path,
        action: ctx.input.action
      },
      message: `${ctx.input.action === 'lock' ? 'Locked' : 'Unlocked'} file **${ctx.input.path}**`
    };
  })
  .build();
