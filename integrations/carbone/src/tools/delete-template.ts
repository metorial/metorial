import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a template from Carbone storage. Accepts either a template ID (deletes all versions) or a specific version ID.`,
  constraints: ['This action is irreversible. The deleted template cannot be recovered.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIdOrVersionId: z
        .string()
        .describe('Template ID or Version ID of the template to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    await client.deleteTemplate(ctx.input.templateIdOrVersionId);

    return {
      output: { success: true },
      message: `Template **${ctx.input.templateIdOrVersionId}** deleted successfully.`
    };
  })
  .build();
