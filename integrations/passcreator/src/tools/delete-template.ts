import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Pass Template',
  key: 'delete_template',
  description: `Permanently delete a pass template. This action cannot be undone and will affect all passes created from this template.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Unique identifier of the template to delete')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Identifier of the deleted template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { templateId: ctx.input.templateId },
      message: `Deleted template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
