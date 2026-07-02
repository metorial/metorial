import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing CraftMyPDF template's name or sample JSON data.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update.'),
      name: z.string().optional().describe('New name for the template.'),
      sampleJson: z
        .string()
        .optional()
        .describe('New sample JSON data for the template (as a JSON string).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the update request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Updating template...');

    let result = await client.updateTemplate({
      templateId: ctx.input.templateId,
      name: ctx.input.name,
      json: ctx.input.sampleJson
    });

    let changes: string[] = [];
    if (ctx.input.name) changes.push(`name to "${ctx.input.name}"`);
    if (ctx.input.sampleJson) changes.push('sample JSON data');

    return {
      output: {
        status: result.status
      },
      message: `Template ${ctx.input.templateId} updated: ${changes.join(', ') || 'no changes'}.`
    };
  })
  .build();
