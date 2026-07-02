import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Move a template to trash. Trashed templates can be restored later. Use this to remove templates you no longer need.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to delete (move to trash)')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('ID of the deleted template'),
      deleted: z.boolean().describe('Whether the template was successfully trashed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: ctx.input.templateId,
        deleted: true
      },
      message: `Template (ID: ${ctx.input.templateId}) has been moved to trash.`
    };
  })
  .build();
