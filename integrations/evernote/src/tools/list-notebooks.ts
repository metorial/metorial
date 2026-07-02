import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotebooksTool = SlateTool.create(spec, {
  name: 'List Notebooks',
  key: 'list_notebooks',
  description: `List all notebooks in the user's Evernote account. Returns notebook names, GUIDs, stack groupings, and whether each is the default notebook. Use this to discover available notebooks before creating or moving notes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      notebooks: z
        .array(
          z.object({
            notebookGuid: z.string().describe('Unique identifier for the notebook'),
            name: z.string().describe('Name of the notebook'),
            isDefault: z.boolean().describe('Whether this is the default notebook'),
            stack: z.string().optional().describe('Stack the notebook belongs to, if any'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the notebook was created'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the notebook was last updated')
          })
        )
        .describe('List of notebooks in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let notebooks = await client.listNotebooks();

    let result = notebooks.map(nb => ({
      notebookGuid: nb.notebookGuid || '',
      name: nb.name || '',
      isDefault: nb.defaultNotebook || false,
      stack: nb.stack,
      createdAt: nb.serviceCreated ? new Date(nb.serviceCreated).toISOString() : undefined,
      updatedAt: nb.serviceUpdated ? new Date(nb.serviceUpdated).toISOString() : undefined
    }));

    return {
      output: { notebooks: result },
      message: `Found **${result.length}** notebook(s).`
    };
  })
  .build();
