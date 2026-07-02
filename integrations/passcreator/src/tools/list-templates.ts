import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Pass Templates',
  key: 'list_templates',
  description: `Retrieve all pass templates available in the account. Returns template identifiers and names, useful for discovering which templates exist before creating or managing passes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            name: z.string().describe('Display name of the template')
          })
        )
        .describe('List of available pass templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templates = await client.listTemplates();

    let mapped = templates.map((t: any) => ({
      templateId: t.identifier,
      name: t.name
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** pass template(s).`
    };
  })
  .build();
