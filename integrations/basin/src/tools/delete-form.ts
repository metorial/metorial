import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteForm = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Permanently delete a form endpoint and all its associated data including submissions. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.number().describe('ID of the form to delete.')
    })
  )
  .output(
    z.object({
      formId: z.number().describe('ID of the deleted form.'),
      name: z.string().describe('Name of the deleted form.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let form = await client.deleteForm(ctx.input.formId);

    return {
      output: {
        formId: form.id,
        name: form.name ?? ''
      },
      message: `Deleted form **${form.name ?? ctx.input.formId}** (ID: ${ctx.input.formId}).`
    };
  })
  .build();
