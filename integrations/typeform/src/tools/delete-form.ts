import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

export let deleteForm = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Permanently delete a typeform and all its associated data including responses, webhooks, and analytics. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the form was successfully deleted'),
      formId: z.string().describe('ID of the deleted form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteForm(ctx.input.formId);

    return {
      output: {
        deleted: true,
        formId: ctx.input.formId
      },
      message: `Deleted form \`${ctx.input.formId}\`.`
    };
  })
  .build();
