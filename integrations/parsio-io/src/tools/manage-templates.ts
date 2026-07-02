import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `Enable, disable, or delete parsing templates in bulk. Provide one or more template IDs and the action to perform on them.`,
  instructions: [
    'Choose exactly one action: **enable**, **disable**, or **delete**.',
    'The **delete** action is permanent and cannot be undone.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['enable', 'disable', 'delete'])
        .describe('Action to perform on the templates'),
      templateIds: z.array(z.string()).min(1).describe('IDs of the templates to manage')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      action: z.string().describe('The action that was performed'),
      count: z.number().describe('Number of templates affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'enable') {
      await client.enableTemplates(ctx.input.templateIds);
    } else if (ctx.input.action === 'disable') {
      await client.disableTemplates(ctx.input.templateIds);
    } else {
      await client.deleteTemplates(ctx.input.templateIds);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action,
        count: ctx.input.templateIds.length
      },
      message: `Successfully **${ctx.input.action}d** ${ctx.input.templateIds.length} template(s).`
    };
  })
  .build();
