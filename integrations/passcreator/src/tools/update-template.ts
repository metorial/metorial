import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Pass Template',
  key: 'update_template',
  description: `Update an existing pass template with new settings. Uses partial update (PATCH) so only the provided fields are changed — omitted fields remain unchanged. Optionally publishes changes to push updates to all active passes using this template.`,
  instructions: [
    'Only the fields you provide will be updated; all other template settings remain unchanged.',
    'Set publish to true to immediately push changes to all active passes.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Unique identifier of the template to update'),
      updates: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update on the template (e.g., name, description, colors, fields, barcode)'
        ),
      publish: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to publish changes to all active passes after updating')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Identifier of the updated template'),
      published: z.boolean().describe('Whether changes were published to active passes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.patchTemplate(ctx.input.templateId, ctx.input.updates);

    let published = false;
    if (ctx.input.publish) {
      await client.publishTemplate(ctx.input.templateId);
      published = true;
    }

    return {
      output: {
        templateId: ctx.input.templateId,
        published
      },
      message: `Updated template \`${ctx.input.templateId}\`${published ? ' and published changes to active passes' : ''}.`
    };
  })
  .build();
