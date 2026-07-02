import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update metadata for an existing Carbone template. You can modify the name, comment, tags, category, deployment timestamp, or expiration timestamp without re-uploading the template file.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIdOrVersionId: z
        .string()
        .describe('Template ID or Version ID of the template to update.'),
      name: z.string().optional().describe('New name for the template.'),
      comment: z.string().optional().describe('New comment or description for the template.'),
      tags: z.array(z.string()).optional().describe('Updated list of tags for the template.'),
      category: z.string().optional().describe('Updated category/folder for the template.'),
      deployedAt: z
        .number()
        .optional()
        .describe('UTC Unix timestamp to set the deployed version.'),
      expireAt: z
        .number()
        .optional()
        .describe('UTC Unix timestamp for template expiration/deletion.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    await client.updateTemplate(ctx.input.templateIdOrVersionId, {
      name: ctx.input.name,
      comment: ctx.input.comment,
      tags: ctx.input.tags,
      category: ctx.input.category,
      deployedAt: ctx.input.deployedAt,
      expireAt: ctx.input.expireAt
    });

    return {
      output: { success: true },
      message: `Template **${ctx.input.templateIdOrVersionId}** updated successfully.`
    };
  })
  .build();
