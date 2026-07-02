import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve details about a specific Grist document, including its name, workspace, and access information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      name: z.string().describe('Document name'),
      isPinned: z.boolean().optional().describe('Whether the document is pinned'),
      urlId: z.string().nullable().optional().describe('Custom URL ID if set'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      workspace: z
        .object({
          workspaceId: z.number().describe('Workspace ID'),
          name: z.string().describe('Workspace name')
        })
        .optional()
        .describe('Workspace the document belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let doc = await client.getDocument(ctx.input.documentId);

    return {
      output: {
        documentId: doc.id,
        name: doc.name,
        isPinned: doc.isPinned,
        urlId: doc.urlId ?? null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        workspace: doc.workspace
          ? {
              workspaceId: doc.workspace.id,
              name: doc.workspace.name
            }
          : undefined
      },
      message: `Document **${doc.name}** (ID: ${doc.id}).`
    };
  })
  .build();

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Create a new empty document in a workspace.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z.number().describe('Workspace ID to create the document in'),
      name: z.string().optional().describe('Name for the new document'),
      isPinned: z.boolean().optional().describe('Whether to pin the document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the created document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let documentId = await client.createDocument(ctx.input.workspaceId, {
      name: ctx.input.name,
      isPinned: ctx.input.isPinned
    });

    return {
      output: { documentId },
      message: `Created document${ctx.input.name ? ` **${ctx.input.name}**` : ''} with ID **${documentId}**.`
    };
  })
  .build();

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update a document's properties such as name and pinned status. Can also move the document to a different workspace.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID to update'),
      name: z.string().optional().describe('New document name'),
      isPinned: z.boolean().optional().describe('Pin or unpin the document'),
      moveToWorkspaceId: z.number().optional().describe('Move the document to this workspace')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let updates: Record<string, any> = {};
    if (ctx.input.name !== undefined) updates.name = ctx.input.name;
    if (ctx.input.isPinned !== undefined) updates.isPinned = ctx.input.isPinned;

    if (Object.keys(updates).length > 0) {
      await client.updateDocument(ctx.input.documentId, updates);
    }

    if (ctx.input.moveToWorkspaceId !== undefined) {
      await client.moveDocument(ctx.input.documentId, ctx.input.moveToWorkspaceId);
    }

    let changes: string[] = [];
    if (ctx.input.name) changes.push(`renamed to **${ctx.input.name}**`);
    if (ctx.input.isPinned !== undefined)
      changes.push(ctx.input.isPinned ? 'pinned' : 'unpinned');
    if (ctx.input.moveToWorkspaceId)
      changes.push(`moved to workspace **${ctx.input.moveToWorkspaceId}**`);

    return {
      output: { updated: true },
      message: `Document **${ctx.input.documentId}** ${changes.join(', ') || 'updated'}.`
    };
  })
  .build();

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Soft-delete a document (move to trash) or permanently delete it. Soft-deleted documents can be restored.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID to delete'),
      permanent: z
        .boolean()
        .optional()
        .describe('If true, permanently delete instead of soft-deleting')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the document was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.deleteDocument(ctx.input.documentId, ctx.input.permanent);

    let action = ctx.input.permanent ? 'permanently deleted' : 'moved to trash';
    return {
      output: { deleted: true },
      message: `Document **${ctx.input.documentId}** was ${action}.`
    };
  })
  .build();
