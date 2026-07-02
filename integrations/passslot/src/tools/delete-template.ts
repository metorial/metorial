import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a pass template from PassSlot. This permanently removes the template and may affect passes generated from it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('ID of the deleted template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: ctx.input.templateId
      },
      message: `Deleted template **${ctx.input.templateId}**.`
    };
  })
  .build();
