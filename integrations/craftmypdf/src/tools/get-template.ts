import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific CraftMyPDF template, including its structure, sample JSON data, and metadata. Optionally retrieve a specific version.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve.'),
      version: z
        .number()
        .optional()
        .describe('Specific template version to retrieve. Defaults to the latest version.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the template.'),
      name: z.string().describe('Name of the template.'),
      groupName: z.string().describe('Group name the template belongs to.'),
      sampleJson: z.string().describe('Sample JSON data for the template.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getTemplate(ctx.input.templateId, ctx.input.version);

    return {
      output: {
        templateId: result.template_id,
        name: result.name,
        groupName: result.group_name || '',
        sampleJson: result.json || ''
      },
      message: `Retrieved template **"${result.name}"** (${result.template_id}).`
    };
  })
  .build();
