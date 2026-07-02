import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve available proposal templates. Templates serve as blueprints whose sections are copied into new proposals when using a templateId.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicTemplates: z
        .boolean()
        .optional()
        .describe('Set to true to include shared/public templates')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string(),
          name: z.string(),
          accountId: z.number(),
          createdAt: z.string(),
          publicTemplate: z.boolean(),
          dummyTemplate: z.boolean()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templates = await client.listTemplates(ctx.input.publicTemplates);

    return {
      output: { templates },
      message: `Found **${templates.length}** templates.`
    };
  })
  .build();
