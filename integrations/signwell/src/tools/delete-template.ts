import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a document template from SignWell. This removes the template and its configuration but does not affect documents already created from it.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the deleted template'),
      deleted: z.boolean().describe('Whether the template was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: ctx.input.templateId,
        deleted: true
      },
      message: `Template **${ctx.input.templateId}** has been deleted.`
    };
  })
  .build();
