import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Pass Template',
  key: 'get_template',
  description: `Retrieve the full details of a pass template, including its fields, colors, images, barcode configuration, and all other settings. Use this to inspect a template's structure before creating or updating passes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Unique identifier of the pass template')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the template'),
      template: z
        .record(z.string(), z.any())
        .describe(
          'Full template configuration including fields, colors, images, barcode settings, and other properties'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let template = await client.describeTemplate(ctx.input.templateId);

    let data = template.data || template;

    return {
      output: {
        templateId: ctx.input.templateId,
        template: data
      },
      message: `Retrieved template details for **${data.name || ctx.input.templateId}**.`
    };
  })
  .build();
