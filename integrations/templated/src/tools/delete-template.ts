import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a template by its ID. This action is irreversible and the template cannot be recovered.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { deleted: true },
      message: `Template **${ctx.input.templateId}** has been permanently deleted.`
    };
  })
  .build();
