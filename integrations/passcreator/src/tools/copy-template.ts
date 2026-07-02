import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyTemplate = SlateTool.create(spec, {
  name: 'Copy Pass Template',
  key: 'copy_template',
  description: `Create a copy of an existing pass template with a new name. Useful for creating variations of a template without starting from scratch.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceTemplateId: z.string().describe('Identifier of the template to copy'),
      name: z.string().describe('Name for the new template copy'),
      description: z.string().optional().describe('Description for the new template copy')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Identifier of the newly created template copy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.copyTemplate(ctx.input.sourceTemplateId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    let templateId = result.identifier || result.data?.identifier;

    return {
      output: { templateId },
      message: `Copied template \`${ctx.input.sourceTemplateId}\` as **${ctx.input.name}** with new ID \`${templateId}\`.`
    };
  })
  .build();
