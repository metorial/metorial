import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific pass template, including its full styling configuration, placeholder fields, barcode settings, and distribution URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Unique template identifier'),
      name: z.string().describe('Template display name'),
      passType: z.string().describe('Pass type identifier'),
      formatVersion: z.number().optional().describe('Format version number'),
      placeholders: z.array(z.string()).optional().describe('Dynamic placeholder field names'),
      passDescription: z
        .any()
        .optional()
        .describe('Full pass styling and field configuration'),
      distributionUrl: z.string().optional().describe('Short link to the pass template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let template = await client.getTemplate(ctx.input.templateId);
    let urlResult = await client.getTemplateUrl(ctx.input.templateId).catch(() => null);

    return {
      output: {
        templateId: template.id,
        name: template.name,
        passType: template.passType,
        formatVersion: template.formatVersion,
        placeholders: template.placeholder,
        passDescription: template.description,
        distributionUrl: urlResult?.url
      },
      message: `Retrieved template **${template.name}** (ID: ${template.id}).`
    };
  })
  .build();
