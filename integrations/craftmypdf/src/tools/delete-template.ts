import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a CraftMyPDF template. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the deletion request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Deleting template...');

    let result = await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        status: result.status
      },
      message: `Template ${ctx.input.templateId} has been permanently deleted.`
    };
  })
  .build();
