import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient, mapTemplate } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description:
    'Retrieve a Documint template by ID, including its name and full provider metadata. Call list_templates to discover template IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      templateId: z
        .string()
        .min(1)
        .describe('Template ID. Call list_templates to discover template IDs.')
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
    let result = await client.getTemplate(ctx.input.templateId);
    let output = mapTemplate(result, ctx.input.templateId);
    return {
      output,
      message: `Retrieved template **${output.templateName || output.templateId}**.`
    };
  })
  .build();
