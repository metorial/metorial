import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let placeholderFieldSchema = z.object({
  apiKey: z.string().describe('The placeholder key to set a value for'),
  value: z.string().describe('The value for this placeholder')
});

export let copyTemplate = SlateTool.create(spec, {
  name: 'Copy Template',
  key: 'copy_template',
  description: `Creates a copy of an existing template, optionally with a new title and pre-filled placeholder values. Can also copy to another eSignatures account using a target API key.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to copy'),
      title: z.string().optional().describe('Title for the copied template'),
      placeholderFields: z
        .array(placeholderFieldSchema)
        .optional()
        .describe('Placeholder values to customize the copy'),
      targetApiKey: z
        .string()
        .optional()
        .describe('API key of another eSignatures account to copy the template to')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the newly created template copy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { templateId, ...params } = ctx.input;

    ctx.progress('Copying template...');

    let result = await client.copyTemplate(templateId, params);

    let newTemplateData = result?.data?.[0] || result?.data || result;

    return {
      output: {
        templateId: newTemplateData?.templateId || ''
      },
      message: `Template **${templateId}** copied. New template ID: **${newTemplateData?.templateId}**.`
    };
  })
  .build();
