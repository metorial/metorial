import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageNotebook = SlateTool.create(spec, {
  name: 'Manage Notebook',
  key: 'manage_notebook',
  description: `Create, update, or delete a notebook (wiki-style document) in a Teamwork project. Notebooks support rich content, categories, and tags.`,
  instructions: [
    'For "create", provide projectId, name, and content.',
    'For "update" and "delete", provide the notebookId.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      notebookId: z.string().optional().describe('Notebook ID (required for update/delete)'),
      projectId: z.string().optional().describe('Project ID (required for create)'),
      name: z.string().optional().describe('Notebook title'),
      content: z.string().optional().describe('Notebook content (HTML)'),
      categoryId: z.string().optional().describe('Category ID'),
      tags: z.string().optional().describe('Comma-separated tags')
    })
  )
  .output(
    z.object({
      notebookId: z.string().optional().describe('ID of the notebook'),
      name: z.string().optional().describe('Notebook title'),
      created: z.boolean().optional().describe('Whether the notebook was created'),
      updated: z.boolean().optional().describe('Whether the notebook was updated'),
      deleted: z.boolean().optional().describe('Whether the notebook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.projectId) throw new Error('projectId is required to create a notebook');
      if (!ctx.input.name) throw new Error('name is required to create a notebook');
      if (!ctx.input.content) throw new Error('content is required to create a notebook');
      let result = await client.createNotebook(ctx.input.projectId, {
        name: ctx.input.name,
        content: ctx.input.content,
        categoryId: ctx.input.categoryId,
        tags: ctx.input.tags
      });
      let notebookId = result.notebookId || result.id;
      return {
        output: {
          notebookId: notebookId ? String(notebookId) : undefined,
          name: ctx.input.name,
          created: true
        },
        message: `Created notebook **${ctx.input.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.notebookId)
        throw new Error('notebookId is required to update a notebook');
      await client.updateNotebook(ctx.input.notebookId, {
        name: ctx.input.name,
        content: ctx.input.content,
        categoryId: ctx.input.categoryId,
        tags: ctx.input.tags
      });
      return {
        output: { notebookId: ctx.input.notebookId, name: ctx.input.name, updated: true },
        message: `Updated notebook **${ctx.input.notebookId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.notebookId)
        throw new Error('notebookId is required to delete a notebook');
      await client.deleteNotebook(ctx.input.notebookId);
      return {
        output: { notebookId: ctx.input.notebookId, deleted: true },
        message: `Deleted notebook **${ctx.input.notebookId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
