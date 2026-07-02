import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateNotebookTool = SlateTool.create(spec, {
  name: 'Update Notebook',
  key: 'update_notebook',
  description: `Update an existing notebook's name or stack assignment. Provide the notebook GUID and the fields to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      notebookGuid: z.string().describe('GUID of the notebook to update'),
      name: z.string().optional().describe('New name for the notebook'),
      stack: z
        .string()
        .optional()
        .describe('New stack name, or empty string to remove from stack')
    })
  )
  .output(
    z.object({
      notebookGuid: z.string().describe('GUID of the updated notebook'),
      updateSequenceNum: z.number().describe('Update sequence number after the change')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let usn = await client.updateNotebook({
      notebookGuid: ctx.input.notebookGuid,
      name: ctx.input.name,
      stack: ctx.input.stack
    });

    return {
      output: {
        notebookGuid: ctx.input.notebookGuid,
        updateSequenceNum: usn
      },
      message: `Updated notebook \`${ctx.input.notebookGuid}\`.`
    };
  })
  .build();
