import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNotebook = SlateTool.create(spec, {
  name: 'Create Notebook',
  key: 'create_notebook',
  description: `Create a new OneNote notebook with the specified name. The notebook is created in the authenticated user's default OneDrive location.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      displayName: z.string().describe('The name for the new notebook')
    })
  )
  .output(
    z.object({
      notebookId: z.string(),
      displayName: z.string(),
      createdDateTime: z.string(),
      lastModifiedDateTime: z.string(),
      isDefault: z.boolean(),
      isShared: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let notebook = await client.createNotebook(ctx.input.displayName);

    return {
      output: {
        notebookId: notebook.notebookId,
        displayName: notebook.displayName,
        createdDateTime: notebook.createdDateTime,
        lastModifiedDateTime: notebook.lastModifiedDateTime,
        isDefault: notebook.isDefault,
        isShared: notebook.isShared
      },
      message: `Created notebook **${notebook.displayName}** (ID: \`${notebook.notebookId}\`).`
    };
  })
  .build();
