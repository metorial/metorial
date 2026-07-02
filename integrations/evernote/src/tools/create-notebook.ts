import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNotebookTool = SlateTool.create(spec, {
  name: 'Create Notebook',
  key: 'create_notebook',
  description: `Create a new notebook in Evernote. Optionally assign it to a stack for organizational grouping.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new notebook'),
      stack: z.string().optional().describe('Optional stack name to group this notebook under')
    })
  )
  .output(
    z.object({
      notebookGuid: z.string().describe('Unique identifier of the created notebook'),
      name: z.string().describe('Name of the created notebook'),
      stack: z.string().optional().describe('Stack the notebook was assigned to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let notebook = await client.createNotebook({
      name: ctx.input.name,
      stack: ctx.input.stack
    });

    return {
      output: {
        notebookGuid: notebook.notebookGuid || '',
        name: notebook.name || '',
        stack: notebook.stack
      },
      message: `Created notebook **${notebook.name}**${notebook.stack ? ` in stack "${notebook.stack}"` : ''}.`
    };
  })
  .build();
