import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let deleteForm = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Permanently delete a form by its ID. This removes the form and all associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The 32-character alphanumeric key of the form to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the form was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    await client.deleteForm(ctx.input.formId);

    return {
      output: { success: true },
      message: `Deleted form **${ctx.input.formId}**.`
    };
  })
  .build();
