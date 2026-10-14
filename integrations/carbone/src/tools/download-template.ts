import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadTemplate = SlateTool.create(spec, {
  name: 'Download Template',
  key: 'download_template',
  description:
    'Download a stored Carbone template using its template ID or version ID. Use list_templates to discover template and version IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateIdOrVersionId: z
        .string()
        .min(1)
        .describe('Template ID or version ID from list_templates or upload_template.')
    })
  )
  .output(
    z.object({
      templateIdOrVersionId: z.string().describe('Requested template or version ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });
    await ctx.addAttachment({
      type: 'url',
      ...client.getDownloadDetails('template', ctx.input.templateIdOrVersionId)
    });
    return {
      output: { templateIdOrVersionId: ctx.input.templateIdOrVersionId },
      message: `Prepared template **${ctx.input.templateIdOrVersionId}** for download.`
    };
  })
  .build();
