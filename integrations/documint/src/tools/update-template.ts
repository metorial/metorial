import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient, mapTemplate } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description:
    'Rename a Documint template and retrieve its current metadata. Call list_templates to discover template IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      templateId: z
        .string()
        .min(1)
        .describe('Template ID. Call list_templates to discover template IDs.'),
      name: z.string().trim().min(1).describe('New display name of the template.')
    })
  )
  .output(
    z.object({
      templateId: z.string(),
      templateName: z.string(),
      rawTemplate: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocumintClient(ctx.auth.token);
    let result = await client.updateTemplate(ctx.input.templateId, ctx.input.name);
    let output = mapTemplate(result, ctx.input.templateId);
    return {
      output,
      message: `Updated template **${output.templateName || output.templateId}**.`
    };
  })
  .build();
