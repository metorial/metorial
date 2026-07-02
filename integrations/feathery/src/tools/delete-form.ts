import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let deleteForm = SlateTool.create(spec, {
  name: 'Delete Form',
  key: 'delete_form',
  description: `Permanently delete a form from Feathery. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteForm(ctx.input.formId);

    return {
      output: { deleted: true },
      message: `Deleted form **${ctx.input.formId}**.`
    };
  })
  .build();
