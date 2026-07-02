import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a document template. This removes the template and all its versions from PDFMonkey. Existing documents generated from this template are not affected.`,
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
      deleted: z.boolean().describe('Whether the template was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { deleted: true },
      message: `Template **${ctx.input.templateId}** deleted successfully.`
    };
  })
  .build();
