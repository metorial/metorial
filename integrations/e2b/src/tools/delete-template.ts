import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a sandbox template. Existing sandboxes created from this template will continue running, but no new sandboxes can be created from it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The unique identifier of the template to delete.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('The ID of the deleted template.'),
      deleted: z.boolean().describe('Whether the template was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Deleting template...');
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: ctx.input.templateId,
        deleted: true
      },
      message: `Template **${ctx.input.templateId}** has been permanently deleted.`
    };
  })
  .build();
