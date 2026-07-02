import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFormTool = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Delete a JotForm form by its ID. This moves the form to the trash. Use with caution as it affects all submissions associated with the form.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to delete')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the deleted form'),
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    await client.deleteForm(ctx.input.formId);

    return {
      output: {
        formId: ctx.input.formId,
        deleted: true
      },
      message: `Deleted form **${ctx.input.formId}**.`
    };
  })
  .build();
