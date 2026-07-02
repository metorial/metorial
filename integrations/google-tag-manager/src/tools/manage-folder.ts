import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let folderOutputSchema = z.object({
  folderId: z.string().optional().describe('Folder ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  workspaceId: z.string().optional().describe('Parent workspace ID'),
  name: z.string().optional().describe('Folder name'),
  notes: z.string().optional().describe('Folder notes'),
  fingerprint: z.string().optional().describe('Folder fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI')
});

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, list, get, update, or delete folders in a GTM workspace. Folders provide organizational grouping for tags, triggers, and variables. Also supports moving entities between folders.`,
  instructions: [
    'Use "move_entities" to move tags, triggers, or variables into a specific folder.',
    'Use "list_entities" to see which tags, triggers, and variables are in a folder.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageFolder)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete', 'list_entities', 'move_entities'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().describe('GTM workspace ID'),
      folderId: z
        .string()
        .optional()
        .describe(
          'Folder ID (required for get, update, delete, list_entities, move_entities)'
        ),
      name: z.string().optional().describe('Folder name (required for create)'),
      notes: z.string().optional().describe('Folder notes'),
      tagIds: z.array(z.string()).optional().describe('Tag IDs to move (for move_entities)'),
      triggerIds: z
        .array(z.string())
        .optional()
        .describe('Trigger IDs to move (for move_entities)'),
      variableIds: z
        .array(z.string())
        .optional()
        .describe('Variable IDs to move (for move_entities)')
    })
  )
  .output(
    z.object({
      folder: folderOutputSchema.optional().describe('Folder details'),
      folders: z.array(folderOutputSchema).optional().describe('List of folders'),
      entities: z
        .object({
          tagCount: z.number().optional().describe('Number of tags in the folder'),
          triggerCount: z.number().optional().describe('Number of triggers in the folder'),
          variableCount: z.number().optional().describe('Number of variables in the folder')
        })
        .optional()
        .describe('Entity counts in the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, workspaceId, folderId } = ctx.input;

    if (action === 'list') {
      let response = await client.listFolders(accountId, containerId, workspaceId);
      let folders = response.folder || [];
      return {
        output: { folders } as any,
        message: `Found **${folders.length}** folder(s) in workspace \`${workspaceId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a folder');
      let folder = await client.createFolder(accountId, containerId, workspaceId, {
        name: ctx.input.name,
        notes: ctx.input.notes
      });
      return {
        output: { folder } as any,
        message: `Created folder **"${folder.name}"** (ID: \`${folder.folderId}\`)`
      };
    }

    if (!folderId)
      throw new Error(
        'folderId is required for get, update, delete, list_entities, and move_entities actions'
      );

    if (action === 'get') {
      let folder = await client.getFolder(accountId, containerId, workspaceId, folderId);
      return {
        output: { folder } as any,
        message: `Retrieved folder **"${folder.name}"**`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
      let folder = await client.updateFolder(
        accountId,
        containerId,
        workspaceId,
        folderId,
        updateData
      );
      return {
        output: { folder } as any,
        message: `Updated folder **"${folder.name}"**`
      };
    }

    if (action === 'delete') {
      await client.deleteFolder(accountId, containerId, workspaceId, folderId);
      return {
        output: { folder: { folderId, accountId, containerId, workspaceId } } as any,
        message: `Deleted folder \`${folderId}\``
      };
    }

    if (action === 'list_entities') {
      let response = await client.listFolderEntities(
        accountId,
        containerId,
        workspaceId,
        folderId
      );
      let tagCount = response.tag?.length || 0;
      let triggerCount = response.trigger?.length || 0;
      let variableCount = response.variable?.length || 0;
      return {
        output: {
          folder: { folderId },
          entities: { tagCount, triggerCount, variableCount }
        } as any,
        message: `Folder \`${folderId}\` contains **${tagCount}** tag(s), **${triggerCount}** trigger(s), **${variableCount}** variable(s)`
      };
    }

    // move_entities
    let targetFolderId = folderId === '0' ? undefined : folderId;
    let movedCount = 0;

    if (folderId === '0') {
      await client.moveEntitiesToFolder(accountId, containerId, workspaceId, folderId, {
        tagId: ctx.input.tagIds,
        triggerId: ctx.input.triggerIds,
        variableId: ctx.input.variableIds
      });
      movedCount =
        (ctx.input.tagIds?.length || 0) +
        (ctx.input.triggerIds?.length || 0) +
        (ctx.input.variableIds?.length || 0);
    } else {
      for (let tagId of ctx.input.tagIds ?? []) {
        await client.updateTag(accountId, containerId, workspaceId, tagId, {
          parentFolderId: targetFolderId
        });
        movedCount += 1;
      }

      for (let triggerId of ctx.input.triggerIds ?? []) {
        await client.updateTrigger(accountId, containerId, workspaceId, triggerId, {
          parentFolderId: targetFolderId
        });
        movedCount += 1;
      }

      for (let variableId of ctx.input.variableIds ?? []) {
        await client.updateVariable(accountId, containerId, workspaceId, variableId, {
          parentFolderId: targetFolderId
        });
        movedCount += 1;
      }
    }

    return {
      output: { folder: { folderId } } as any,
      message: `Moved **${movedCount}** entity/entities into folder \`${folderId}\``
    };
  })
  .build();
