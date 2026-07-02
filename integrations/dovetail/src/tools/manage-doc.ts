import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDoc = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_doc',
  description: `Create, update, or delete a document in Dovetail. Documents are used for research reports or standalone documentation. Supports setting title, content, and custom fields.`,
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
      title: z.string().optional().describe('Document title'),
      content: z.string().optional().describe('Document content body'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label'),
            value: z.string().optional().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields (create only)')
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

    if (ctx.input.action === 'create') {
      let doc = await client.createDoc({
        title: ctx.input.title,
        content: ctx.input.content,
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
      throw new Error('docId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      let doc = await client.updateDoc(ctx.input.docId, {
        title: ctx.input.title,
        content: ctx.input.content
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
