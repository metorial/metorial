import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new PDF template by cloning an existing one. The new template will be a copy of the source template that can be independently modified.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sourceTemplateId: z.string().describe('ID of the existing template to clone.'),
      name: z.string().optional().describe('Name for the new template.'),
      version: z
        .number()
        .optional()
        .describe('Specific version of the source template to clone. Defaults to the latest.'),
      groupName: z
        .string()
        .optional()
        .describe('Group name to organize the new template under.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the newly created template.'),
      name: z.string().describe('Name of the newly created template.'),
      status: z.string().describe('Status of the creation request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Creating new template from source...');

    let result = await client.createTemplate({
      templateId: ctx.input.sourceTemplateId,
      name: ctx.input.name,
      version: ctx.input.version,
      groupName: ctx.input.groupName
    });

    return {
      output: {
        templateId: result.template_id,
        name: result.name,
        status: result.status
      },
      message: `Created new template **"${result.name}"** (${result.template_id}) from source template ${ctx.input.sourceTemplateId}.`
    };
  })
  .build();
