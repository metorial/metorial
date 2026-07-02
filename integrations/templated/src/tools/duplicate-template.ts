import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateTemplate = SlateTool.create(spec, {
  name: 'Duplicate Template',
  key: 'duplicate_template',
  description: `Create an independent copy of an existing template. The duplicate can be customized separately from the original. You can also clone gallery templates into your account.`,
  instructions: [
    'Use "duplicate" for templates you own. Use "clone" for gallery templates.',
    'Cloned templates are only accessible through the API and are not visible in the dashboard.'
  ]
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to duplicate or clone'),
      name: z
        .string()
        .optional()
        .describe('Custom name for the duplicate. Defaults to "Copy of {original_name}"'),
      clone: z
        .boolean()
        .optional()
        .describe('Set to true to clone a gallery template instead of duplicating your own')
    })
  )
  .output(
    z.object({
      templateId: z.string().optional(),
      name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      sourceTemplateId: z.string().optional(),
      isClone: z.boolean().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result: any;
    if (ctx.input.clone) {
      result = await client.cloneTemplate(ctx.input.templateId);
    } else {
      result = await client.duplicateTemplate(ctx.input.templateId, ctx.input.name);
    }

    let action = ctx.input.clone ? 'Cloned' : 'Duplicated';

    return {
      output: {
        templateId: result.id,
        name: result.name,
        width: result.width,
        height: result.height,
        sourceTemplateId: result.sourceTemplateId,
        isClone: result.isClone,
        createdAt: result.createdAt
      },
      message: `${action} template as **${result.name}** with ID \`${result.id}\`.`
    };
  })
  .build();
