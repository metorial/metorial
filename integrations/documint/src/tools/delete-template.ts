import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description:
    'Permanently delete a Documint template. Call list_templates to discover template IDs. This operation cannot be undone.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      templateId: z
        .string()
        .min(1)
        .describe('Template ID. Call list_templates to discover template IDs.')
    })
  )
  .output(z.object({ templateId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new DocumintClient(ctx.auth.token);
    await client.deleteTemplate(ctx.input.templateId);
    return {
      output: { templateId: ctx.input.templateId, deleted: true },
      message: `Deleted template **${ctx.input.templateId}**.`
    };
  })
  .build();
