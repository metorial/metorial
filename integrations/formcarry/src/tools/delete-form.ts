import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteForm = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Permanently deletes a Formcarry form and all its associated submissions. This action cannot be undone.`,
  constraints: [
    'This action is irreversible — the form and all its submissions will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique ID of the form to delete')
    })
  )
  .output(
    z.object({
      statusMessage: z.string().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteForm(ctx.input.formId);

    return {
      output: {
        statusMessage: result.message
      },
      message: `Deleted form **${ctx.input.formId}**.`
    };
  });
