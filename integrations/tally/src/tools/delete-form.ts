import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteForm = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Delete a Tally form by moving it to the trash. This removes the form and all its submissions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique ID of the form to delete')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the deleted form'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteForm(ctx.input.formId);

    return {
      output: {
        formId: ctx.input.formId,
        deleted: true
      },
      message: `Form **${ctx.input.formId}** has been moved to trash.`
    };
  })
  .build();
