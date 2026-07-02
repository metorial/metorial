import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNotebook = SlateTool.create(spec, {
  name: 'Get Notebook',
  key: 'get_notebook',
  description: `Retrieve details of a specific OneNote notebook by its ID, including creation date, sharing status, and modification metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notebookId: z.string().describe('The ID of the notebook to retrieve')
    })
  )
  .output(
    z.object({
      notebookId: z.string(),
      displayName: z.string(),
      createdDateTime: z.string(),
      lastModifiedDateTime: z.string(),
      isDefault: z.boolean(),
      isShared: z.boolean(),
      createdBy: z.object({
        user: z
          .object({
            displayName: z.string().optional(),
            userId: z.string().optional()
          })
          .optional()
      }),
      lastModifiedBy: z.object({
        user: z
          .object({
            displayName: z.string().optional(),
            userId: z.string().optional()
          })
          .optional()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let notebook = await client.getNotebook(ctx.input.notebookId);

    return {
      output: notebook,
      message: `Retrieved notebook **${notebook.displayName}**.`
    };
  })
  .build();
