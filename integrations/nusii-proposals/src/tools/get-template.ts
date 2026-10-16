import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description:
    'Retrieve one template. Use list_templates to discover template IDs and list_sections with templateId to read its content.',
  tags: { readOnly: true }
})
  .input(z.object({ templateId: z.string().describe('Template ID from list_templates') }))
  .output(
    z.object({
      templateId: z.string(),
      name: z.string(),
      accountId: z.number(),
      createdAt: z.string(),
      publicTemplate: z.boolean(),
      dummyTemplate: z.boolean(),
      raw: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getTemplate(ctx.input.templateId);
    return {
      output: result,
      message: `Retrieved template **${result.name}** (ID: ${result.templateId}).`
    };
  })
  .build();
