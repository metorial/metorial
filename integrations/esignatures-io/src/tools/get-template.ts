import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieves the full details of a template including its title, placeholder field keys, signer field IDs, document elements, and creation date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique ID of the template'),
      title: z.string().optional().describe('Title of the template'),
      createdAt: z.string().optional().describe('Creation timestamp of the template'),
      placeholderFields: z
        .array(z.string())
        .optional()
        .describe('List of placeholder field keys used in the template'),
      signerFieldIds: z
        .array(z.string())
        .optional()
        .describe('List of signer field IDs used in the template'),
      documentElements: z
        .array(z.any())
        .optional()
        .describe('Document elements that make up the template structure')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching template details...');

    let result = await client.queryTemplate(ctx.input.templateId);

    let template = result?.data || result;

    let output = {
      templateId: template?.templateId || ctx.input.templateId,
      title: template?.title,
      createdAt: template?.createdAt,
      placeholderFields: template?.placeholderFields,
      signerFieldIds: template?.signerFieldIds,
      documentElements: template?.documentElements
    };

    let placeholders = output.placeholderFields?.length
      ? ` Placeholders: ${output.placeholderFields.join(', ')}.`
      : '';
    let signerFields = output.signerFieldIds?.length
      ? ` Signer fields: ${output.signerFieldIds.join(', ')}.`
      : '';

    return {
      output,
      message: `Template **${output.title || output.templateId}**.${placeholders}${signerFields}`
    };
  })
  .build();
