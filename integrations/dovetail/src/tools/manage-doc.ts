import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { folderIdSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageDoc = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_doc',
  description: `Create, update, or delete a document in Dovetail. Documents are used for research reports or standalone documentation. Supports initial content, title changes, and custom fields.`,
  instructions: [
    'To create a doc, provide at least a title, content, or fields.',
    'To update, provide the docId and the fields to change.',
    'To delete, provide the docId and set action to "delete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      docId: z.string().optional().describe('Document ID (required for update and delete)'),
      contentType: z
        .enum(['html', 'markdown', 'text'])
        .optional()
        .describe('Initial content format (create only).'),
      projectId: projectIdSchema
        .optional()
        .describe(
          'Project ID from list_projects (create only; cannot combine with folderId).'
        ),
      folderId: folderIdSchema
        .optional()
        .describe(
          'Folder ID from browse_folders (create only; cannot combine with projectId).'
        ),
      title: z.string().optional().describe('Document title'),
      content: z
        .string()
        .optional()
        .describe('Initial document content (create only; content cannot be patched).'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label'),
            value: z.string().optional().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields to set during create or update')
    })
  )
  .output(
    z.object({
      docId: z.string(),
      title: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.projectId && ctx.input.folderId)
      throw createApiServiceError('Choose projectId or folderId, not both.');

    if (ctx.input.action === 'create') {
      let doc = await client.createDoc({
        title: ctx.input.title,
        content: ctx.input.content,
        contentType: ctx.input.contentType,
        projectId: ctx.input.projectId,
        folderId: ctx.input.folderId,
        fields: ctx.input.fields
      });
      return {
        output: {
          docId: doc.id,
          title: doc.title,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at
        },
        message: `Created document **${doc.title || 'Untitled'}** (ID: ${doc.id}).`
      };
    }

    if (!ctx.input.docId) {
      throw createApiServiceError('docId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      if (
        ctx.input.projectId !== undefined ||
        ctx.input.folderId !== undefined ||
        ctx.input.contentType !== undefined
      )
        throw createApiServiceError(
          'projectId, folderId, and contentType are only supported when creating a document.'
        );
      if (ctx.input.content !== undefined)
        throw createApiServiceError(
          'Dovetail cannot patch doc content. Update its title or fields, or create a new document with initial content.'
        );
      if (ctx.input.title === undefined && !ctx.input.fields?.length)
        throw createApiServiceError('Provide a title or custom fields to update.');
      let doc = await client.updateDoc(ctx.input.docId, {
        title: ctx.input.title,
        fields: ctx.input.fields
      });
      return {
        output: {
          docId: doc.id,
          title: doc.title,
          updatedAt: doc.updated_at
        },
        message: `Updated document **${doc.title || ctx.input.docId}**.`
      };
    }

    // delete
    let result = await client.deleteDoc(ctx.input.docId);
    return {
      output: {
        docId: result.id,
        title: result.title,
        deleted: true
      },
      message: `Deleted document **${result.title || ctx.input.docId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();
